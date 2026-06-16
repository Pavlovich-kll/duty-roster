export type Profile = {
  id: string
  name: string
  is_admin: boolean
  created_at: string
}

export type DutyShift = {
  id: string
  user_id: string
  date: string
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'name'>
}

export type ShiftWithProfile = DutyShift & {
  profiles: { name: string }
}
