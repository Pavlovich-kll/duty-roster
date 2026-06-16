export type Profile = {
  id: string
  name: string
  is_admin: boolean
  sort_order: number
  telegram: string | null
  mattermost: string | null
  phone: string | null
  created_at: string
}

export type DutyShift = {
  id: string
  user_id: string
  date: string
  created_at: string
  updated_at: string
}

export type ShiftWithProfile = DutyShift & {
  profiles: { name: string }
}

export type Vacation = {
  id: string
  user_id: string
  start_date: string
  end_date: string
  created_at: string
}

export type VacationWithProfile = Vacation & {
  profiles: { name: string }
}
