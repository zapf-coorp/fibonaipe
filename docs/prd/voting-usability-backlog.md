# Backlog: voting usability

Status: items 1 to 8 were implemented in code. Pending: a real session in two browser profiles to confirm the feel of sizes and spacing. Design decisions live in [voting-flow-design](voting-flow-design.md).

## 1. Task picker is a dropdown

Choosing the task to vote on is a list (dropdown), not the current control.

## 2. Disable controls that cannot be used

"Iniciar tempo" fails on some clicks. It stays disabled when the action is not allowed. The same rule applies to every clickable control on the screen: if it cannot succeed, it is not clickable.

## 3. From the team screen to creating a room

The team creation screen has a button that leads to "Criar sala". After assembling a team, the next step is creating the room.

## 4. Design PRD for the flow

Write a design PRD that later screens follow. It decides where buttons live, the hierarchy of each screen, and the design system of the elements. Think the flow through for usability first. The current UI notes live in [ui-ux](../specs/ui-ux.md); this PRD is the product-facing source those notes should follow.

## 5. Card and suit size and spacing

Fix the size and spacing of the voting cards and the suit controls.

## 6. Voting should feel simple

Fine-tune voting so it is simple and visually easy to follow.

## 7. Other players' cards

On each other participant's seat, show a face-down mini card once they have voted. On reveal, show that card's value and suit. On your own seat, the voted card stays face up the whole time.

## 8. Dropdown only offers open tasks, and can reopen closed ones

The task dropdown can select for voting only tasks that have not been voted yet. Already voted tasks can be reopened. Selecting an already voted task shows that voting's data: the vote average and the value the host chose (the host sets the value even after the vote).
