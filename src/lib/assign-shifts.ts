export function getWorkingDays(year: number, month: number): string[] {
  const days: string[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      days.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    }
  }
  return days
}

export type Developer = { id: string; name: string; team: string }
export type VacationMap = Map<string, Set<string>>
export type Assignment = { developer_id: string; date: string }

export function assignShifts(
  developers: Developer[],
  workingDays: string[],
  vacationMap: VacationMap,
  startIndex: number = 0,
): Assignment[] {
  if (developers.length === 0) return []

  const assignments: Assignment[] = []
  let currentIndex = startIndex

  for (const dateStr of workingDays) {
    let assigned = false
    for (let i = 0; i < developers.length; i++) {
      const idx = (currentIndex + i) % developers.length
      const d = developers[idx]
      const onVacation = vacationMap.has(d.id) && vacationMap.get(d.id)!.has(dateStr)
      if (!onVacation) {
        assignments.push({ developer_id: d.id, date: dateStr })
        currentIndex = (idx + 1) % developers.length
        assigned = true
        break
      }
    }
    if (!assigned) {
      currentIndex = currentIndex
    }
  }

  return assignments
}

export function buildVacationMap(
  vacations: { developer_id: string; start_date: string; end_date: string }[],
): VacationMap {
  const map = new Map<string, Set<string>>()
  for (const v of vacations) {
    const start = new Date(v.start_date)
    const end = new Date(v.end_date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10)
      if (!map.has(v.developer_id)) map.set(v.developer_id, new Set())
      map.get(v.developer_id)!.add(ds)
    }
  }
  return map
}
