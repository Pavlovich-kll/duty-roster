export type Profile = {
  id: string
  name: string
  is_admin: boolean
  created_at: string
}

export type Developer = {
  id: string
  name: string
  sort_order: number
  telegram: string | null
  mattermost: string | null
  phone: string | null
  team: string
  created_at: string
}

export const TEAMS = ['java', 'ios', 'web', 'android'] as const
export type Team = typeof TEAMS[number]

export type ShiftWithDeveloper = {
  id: string
  developer_id: string
  date: string
  created_at: string
  updated_at: string
  developers: { name: string }
}

export type VacationWithDeveloper = {
  id: string
  developer_id: string
  start_date: string
  end_date: string
  created_at: string
  developers: { name: string }
}
