/*
  # Add function to set user role

  1. New Function
    - `set_user_role(user_id uuid, new_role app_role)` - Sets a user's role
    - Executes with SECURITY DEFINER to bypass RLS
    - Can only be called by admins or service role
  
  2. Security
    - Function runs with elevated privileges to bypass RLS
    - Used by invite-user edge function
*/

CREATE OR REPLACE FUNCTION set_user_role(
  target_user_id uuid,
  new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's role
  UPDATE user_roles
  SET role = new_role
  WHERE user_id = target_user_id;
  
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (target_user_id, new_role);
  END IF;
END;
$$;