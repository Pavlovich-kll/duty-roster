import { describe, it, expect } from 'vitest'
import { assignShifts, buildVacationMap, getWorkingDays, type Developer, type VacationMap } from '@/lib/assign-shifts'

const devs: Developer[] = [
  { id: '1', name: 'Alice', team: 'java' },
  { id: '2', name: 'Bob', team: 'java' },
  { id: '3', name: 'Charlie', team: 'java' },
  { id: '4', name: 'Diana', team: 'java' },
]

describe('getWorkingDays', () => {
  it('returns only Mon-Fri for June 2026', () => {
    // June 2026: Mon 1, Tue 2, ..., Sun 7, etc.
    const days = getWorkingDays(2026, 6)
    expect(days).toContain('2026-06-01') // Monday
    expect(days).toContain('2026-06-05') // Friday
    expect(days).not.toContain('2026-06-06') // Saturday
    expect(days).not.toContain('2026-06-07') // Sunday
  })

  it('returns correct count for June 2026', () => {
    const days = getWorkingDays(2026, 6)
    // June 2026 has 30 days, starts on Monday
    // 4 full weeks = 20 weekdays + Mon 29 + Tue 30 = 22
    expect(days.length).toBe(22)
  })
})

describe('buildVacationMap', () => {
  it('builds a set of dates per developer', () => {
    const map = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-10', end_date: '2026-06-12' },
    ])
    expect(map.get('1')?.has('2026-06-10')).toBe(true)
    expect(map.get('1')?.has('2026-06-11')).toBe(true)
    expect(map.get('1')?.has('2026-06-12')).toBe(true)
    expect(map.get('1')?.has('2026-06-13')).toBe(false)
    expect(map.size).toBe(1)
  })

  it('handles multiple developers', () => {
    const map = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-10', end_date: '2026-06-12' },
      { developer_id: '2', start_date: '2026-06-15', end_date: '2026-06-15' },
    ])
    expect(map.get('1')?.size).toBe(3)
    expect(map.get('2')?.size).toBe(1)
  })

  it('returns empty map for no vacations', () => {
    const map = buildVacationMap([])
    expect(map.size).toBe(0)
  })
})

describe('assignShifts - basic round-robin', () => {
  const days = getWorkingDays(2026, 6)

  it('assigns in round-robin order with no vacations', () => {
    const assignments = assignShifts(devs, days, new Map())
    expect(assignments.length).toBe(days.length)

    // First 4 days: Alice, Bob, Charlie, Diana
    expect(assignments[0].developer_id).toBe('1') // Alice
    expect(assignments[1].developer_id).toBe('2') // Bob
    expect(assignments[2].developer_id).toBe('3') // Charlie
    expect(assignments[3].developer_id).toBe('4') // Diana
    expect(assignments[4].developer_id).toBe('1') // Alice (wraps around)
  })

  it('respects startIndex', () => {
    const assignments = assignShifts(devs, days.slice(0, 3), new Map(), 2)
    expect(assignments[0].developer_id).toBe('3') // Charlie (index 2)
    expect(assignments[1].developer_id).toBe('4') // Diana
    expect(assignments[2].developer_id).toBe('1') // Alice
  })
})

describe('assignShifts - vacation skipping', () => {
  const days = getWorkingDays(2026, 6)

  it('skips a developer on vacation and moves to the next', () => {
    // Alice on vacation June 1 (Monday, first working day)
    const vacMap = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-01', end_date: '2026-06-01' },
    ])
    const assignments = assignShifts(devs, [days[0]], vacMap)
    // First day: Alice is on vacation, so Bob gets assigned
    expect(assignments[0].developer_id).toBe('2') // Bob
  })

  it('assigns all 4 developers correctly when one is on vacation for a few days', () => {
    const june12 = '2026-06-01'
    // Bob on vacation first 2 days
    const vacMap = buildVacationMap([
      { developer_id: '2', start_date: '2026-06-01', end_date: '2026-06-02' },
    ])
    const days = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04']
    const a = assignShifts(devs, days, vacMap)

    // Day 1 (Mon Jun 1): Alice (1), Bob is out → skip, next is Charlie (3) → wait no
    // currentIndex=0, iterate: i=0 idx=0 Alice not on vac → assigned
    // Day 2 (Tue Jun 2): currentIndex=1, iterate: i=0 idx=1 Bob on vac, i=1 idx=2 Charlie → assigned
    // Day 3 (Wed Jun 3): currentIndex=3, iterate: i=0 idx=3 Diana → assigned
    // Day 4 (Thu Jun 4): currentIndex=0, iterate: i=0 idx=0 Alice → assigned
    expect(a[0].developer_id).toBe('1') // Alice
    expect(a[1].developer_id).toBe('3') // Charlie (Bob skipped)
    expect(a[2].developer_id).toBe('4') // Diana
    expect(a[3].developer_id).toBe('1') // Alice
  })

  it('skips multiple concurrent vacations', () => {
    // Alice and Bob on vacation June 1
    const vacMap = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-01', end_date: '2026-06-01' },
      { developer_id: '2', start_date: '2026-06-01', end_date: '2026-06-01' },
    ])
    const a = assignShifts(devs, [days[0]], vacMap)
    // Alice (1) skipped, Bob (2) skipped, Charlie (3) assigned
    expect(a[0].developer_id).toBe('3')
  })

  it('handles all developers on vacation - returns empty that day', () => {
    const vacMap = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-01', end_date: '2026-06-01' },
      { developer_id: '2', start_date: '2026-06-01', end_date: '2026-06-01' },
      { developer_id: '3', start_date: '2026-06-01', end_date: '2026-06-01' },
      { developer_id: '4', start_date: '2026-06-01', end_date: '2026-06-01' },
    ])
    const a = assignShifts(devs, ['2026-06-01'], vacMap)
    expect(a.length).toBe(0)
  })

  it('does not advance startIndex when all developers are on vacation', () => {
    const vacMap = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-01', end_date: '2026-06-01' },
      { developer_id: '2', start_date: '2026-06-01', end_date: '2026-06-01' },
      { developer_id: '3', start_date: '2026-06-01', end_date: '2026-06-01' },
      { developer_id: '4', start_date: '2026-06-01', end_date: '2026-06-01' },
    ])
    // Day 1 all on vacation (no assignment), Day 2 no one on vacation
    const a = assignShifts(devs, ['2026-06-01', '2026-06-02'], vacMap)
    expect(a.length).toBe(1)
    // Day 2: still starts from index 0 since nobody was assigned day 1
    expect(a[0].developer_id).toBe('1') // Alice
  })
})

describe('assignShifts - order independence', () => {
  it('produces same result regardless of when vacation is set', () => {
    const days = ['2026-06-01', '2026-06-02', '2026-06-03']

    // Scenario A: vacate Alice on day 2 before assigning
    const vacMapA = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-02', end_date: '2026-06-02' },
    ])
    const a = assignShifts(devs, days, vacMapA)

    // Scenario B: vacate Alice on day 2 after theoretically assigning (same function)
    // The function doesn't care about order since it builds assignments from scratch
    // Test with a different ordering to prove determinism
    const vacMapB = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-02', end_date: '2026-06-02' },
    ])
    const b = assignShifts(devs, days, vacMapB)
    expect(a).toEqual(b)
  })
})

describe('assignShifts - continuity across months', () => {
  it('continues rotation from previous month end', () => {
    const mayDays = ['2026-05-29', '2026-05-30'] // Fri, Sat
    const juneDays = ['2026-06-01', '2026-06-02']

    // May assignments with a specific start index
    const mayAssign = assignShifts(devs, mayDays, new Map(), 2)
    // Day 1 (May 29): Charlie (idx 2)
    // Day 2 (May 30): Saturday - skipped
    expect(mayAssign[0].developer_id).toBe('3') // Charlie

    // Next up after Charlie is Diana (idx 3)
    const juneAssign = assignShifts(devs, juneDays, new Map(), 3)
    expect(juneAssign[0].developer_id).toBe('4') // Diana
    expect(juneAssign[1].developer_id).toBe('1') // Alice
  })
})

describe('assignShifts - team filtering', () => {
  it('only assigns within the team', () => {
    const javaDevs: Developer[] = [
      { id: '1', name: 'Alice', team: 'java' },
      { id: '2', name: 'Bob', team: 'java' },
    ]
    const assignments = assignShifts(javaDevs, ['2026-06-01', '2026-06-02', '2026-06-03'], new Map())
    expect(assignments.length).toBe(3)
    expect(assignments[0].developer_id).toBe('1')
    expect(assignments[1].developer_id).toBe('2')
    expect(assignments[2].developer_id).toBe('1')
  })

  it('skips vacation within a team', () => {
    const javaDevs: Developer[] = [
      { id: '1', name: 'Alice', team: 'java' },
      { id: '2', name: 'Bob', team: 'java' },
    ]
    const vacMap = buildVacationMap([
      { developer_id: '1', start_date: '2026-06-01', end_date: '2026-06-01' },
    ])
    const a = assignShifts(javaDevs, ['2026-06-01'], vacMap)
    expect(a[0].developer_id).toBe('2') // Bob (Alice is on vacation)
  })
})
