// One rule for "is this user active" across the app (Users.Status / Users.IsActive).
// Inactive users are hidden everywhere except the user-management screen.

export interface MaybeActive {
  Status?: string | null
  IsActive?: boolean | null
}

export const isActiveUser = (u: MaybeActive | null | undefined) =>
  !!u && u.IsActive !== false && String(u.Status ?? '').toLowerCase() !== 'inactive'

export const ACTIVE_FIELDS = 'Status, IsActive'
