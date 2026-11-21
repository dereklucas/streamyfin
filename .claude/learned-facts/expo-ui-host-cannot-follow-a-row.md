# An @expo/ui Host cannot follow a list row

`Host` + `RNHostView` (from `@expo/ui/swift-ui`) move their React Native child
into a SwiftUI hosting view and size it from SwiftUI's side. A poster, whose
size is fixed, survives that. A list row does not: its height follows how its
title and overview wrap.

What happened on the show page, when each episode row sat inside
`ContextMenu` → `RNHostView`:

- `matchContents` on both axes: the row took its content's natural width, so
  a long title stayed on one line, the row ran past the screen, and the
  download button went off its end (pushed out of place on iPad).
- As the page scrolled, the rows pinned to the top and collapsed onto each
  other. It happened with both sizing modes tried (both axes, and
  `{ vertical: true }` with the width from the layout) and with the width
  measured and handed to the content: the hosting itself is the problem.

So the iOS context menu is `modules/item-context-menu`: a plain native view
that keeps its React Native children in their own layout and attaches
`UIContextMenuInteraction` to itself. It also gives what SwiftUI's
`.contextMenu` cannot: a tap on the lifted preview (opens the item).

Don't put an `RNHostView` around content whose size depends on its text, and
don't fix a hosting layout bug with sizing props: take the content out of the
host.
