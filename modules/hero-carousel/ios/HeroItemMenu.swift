import SwiftUI

extension View {
  /// The card's long-press context menu, laid out as a poster's
  /// (`components/common/NativeContextMenu.tsx`): the quick actions as an icon
  /// row, then the list, then navigation, then destructive actions in red,
  /// each section apart. No actions, no menu. iOS only: tvOS never shows the
  /// hero, and its ControlGroup needs tvOS 17.
  @ViewBuilder
  func heroItemMenu(
    _ actions: [HeroMenuAction],
    onAction: @escaping (String) -> Void
  ) -> some View {
    #if os(iOS)
    if actions.isEmpty {
      self
    } else {
      contextMenu {
        HeroItemMenuItems(actions: actions, onAction: onAction)
      }
    }
    #else
    self
    #endif
  }
}

#if os(iOS)
private struct HeroItemMenuItems: View {
  let actions: [HeroMenuAction]
  let onAction: (String) -> Void

  private func group(_ action: HeroMenuAction) -> String {
    action.group ?? ((action.destructive ?? false) ? "destructive" : "primary")
  }

  private var quick: [HeroMenuAction] { actions.filter { group($0) == "quick" } }
  private var primary: [HeroMenuAction] { actions.filter { group($0) == "primary" } }
  private var nav: [HeroMenuAction] { actions.filter { group($0) == "nav" } }
  private var destructive: [HeroMenuAction] {
    actions.filter { group($0) == "destructive" }
  }

  var body: some View {
    if !quick.isEmpty {
      ControlGroup {
        ForEach(quick) { action in
          button(action, title: action.shortLabel ?? action.label)
        }
      }
    }
    ForEach(primary) { action in button(action, title: action.label) }
    if !nav.isEmpty {
      if !quick.isEmpty || !primary.isEmpty { Divider() }
      ForEach(nav) { action in button(action, title: action.label) }
    }
    if !destructive.isEmpty {
      if !quick.isEmpty || !primary.isEmpty || !nav.isEmpty { Divider() }
      ForEach(destructive) { action in button(action, title: action.label) }
    }
  }

  @ViewBuilder
  private func button(_ action: HeroMenuAction, title: String) -> some View {
    Button(role: (action.destructive ?? false) ? .destructive : nil) {
      onAction(action.key)
    } label: {
      if let image = action.systemImage {
        Label(title, systemImage: image)
      } else {
        Text(title)
      }
    }
  }
}
#endif
