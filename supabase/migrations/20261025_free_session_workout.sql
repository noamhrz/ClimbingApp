-- Free session ("סשן חופשי"): one shared workout row that every free session is logged under.
-- It has no exercises of its own; the trainee picks them when starting the session.
-- Identified in code by Category = 'סשן חופשי' (lib/free-session.ts). Not assigned to anyone,
-- so it never shows in the regular workouts list.
insert into "Workouts" ("Name", "Category", "Description", "WhenToPractice", "WorkoutNotes", "VideoURL",
                        "containClimbing", "containExercise", "EstimatedClimbingTime", "EstimatedTotalTime",
                        "CalculatedExercisesTime", "IsActive", "CreatedBy", "UpdatedAt")
select 'סשן חופשי', 'סשן חופשי', 'אימון בלי תוכנית: תרגילים שבחרת בעצמך', '', '', '',
       false, true, 0, 0, 0, true, 'noam.hrz@gmail.com', now()
where not exists (select 1 from "Workouts" where "Category" = 'סשן חופשי');

select "WorkoutID", "Name" from "Workouts" where "Category" = 'סשן חופשי';
