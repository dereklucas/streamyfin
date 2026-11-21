import ExpoModulesCore
import UIKit

/// One item of a section, as `contextMenuSections` writes it.
struct ContextMenuItemRecord: Decodable {
  let key: String
  let label: String
  let systemImage: String?
  let destructive: Bool
}

/// A run of items drawn together: "quick" as the small icon row, "list" as rows.
struct ContextMenuSectionRecord: Decodable {
  let kind: String
  let items: [ContextMenuItemRecord]
}

/// The system context menu around React Native content. The content stays a
/// child of this view, laid out by React Native, and the menu is attached to
/// it (as Mail's rows): nothing is moved into a SwiftUI host, whose sizing a
/// row with wrapping text could not follow.
///
/// With `hasPreview`, the last child is the preview, drawn off screen by the
/// JavaScript side; the menu shows a picture of it, taken as it opens.
/// tvOS has no context menus: there the view is a plain container (the
/// JavaScript side never mounts it on TV).
final class ItemContextMenuView: ExpoView {
  let onAction = EventDispatcher()
  let onPreviewPress = EventDispatcher()

  var hasPreview = false
  private var sections: [ContextMenuSectionRecord] = []

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    #if os(iOS)
    addInteraction(UIContextMenuInteraction(delegate: self))
    #endif
  }

  func setMenu(_ json: String) {
    guard
      let data = json.data(using: .utf8),
      let decoded = try? JSONDecoder().decode([ContextMenuSectionRecord].self, from: data)
    else {
      sections = []
      return
    }
    sections = decoded
  }

  fileprivate var menuSections: [ContextMenuSectionRecord] { sections }
}

#if os(iOS)
extension ItemContextMenuView: UIContextMenuInteractionDelegate {

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configurationForMenuAtLocation location: CGPoint
  ) -> UIContextMenuConfiguration? {
    guard !menuSections.isEmpty else { return nil }
    let previewProvider: UIContextMenuContentPreviewProvider?
    if let image = previewImage() {
      previewProvider = { ImagePreviewController(image: image) }
    } else {
      previewProvider = nil
    }
    return UIContextMenuConfiguration(
      identifier: nil,
      previewProvider: previewProvider
    ) { [weak self] _ in
      self?.makeMenu()
    }
  }

  // A tap on what is lifted opens the item, as in Photos and Music. Told at
  // once, not in the animator's completion: there the navigation waited for
  // the poster to settle back into place, a noticeable pause.
  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    willPerformPreviewActionForMenuWith configuration: UIContextMenuConfiguration,
    animator: UIContextMenuInteractionCommitAnimating
  ) {
    animator.preferredCommitStyle = .dismiss
    onPreviewPress()
  }

  // MARK: Menu

  private func makeMenu() -> UIMenu {
    let children: [UIMenuElement] = menuSections.map { section in
      let actions = section.items.map { item -> UIAction in
        UIAction(
          title: item.label,
          image: item.systemImage.flatMap { UIImage(systemName: $0) },
          attributes: item.destructive ? .destructive : []
        ) { [weak self] _ in
          self?.onAction(["key": item.key])
        }
      }
      let menu = UIMenu(title: "", options: .displayInline, children: actions)
      if section.kind == "quick", #available(iOS 16.0, *) {
        menu.preferredElementSize = .small
      }
      return menu
    }
    return UIMenu(title: "", children: children)
  }

  // MARK: Preview

  private var previewView: UIView? {
    guard hasPreview, subviews.count > 1 else { return nil }
    return subviews.last
  }

  private func previewImage() -> UIImage? {
    guard let view = previewView, view.bounds.width > 0, view.bounds.height > 0 else {
      return nil
    }
    let format = UIGraphicsImageRendererFormat()
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(bounds: view.bounds, format: format)
    return renderer.image { context in
      view.layer.render(in: context.cgContext)
    }
  }
}

/// The lifted preview: the picture of the off-screen React Native preview.
private final class ImagePreviewController: UIViewController {
  private let image: UIImage

  init(image: UIImage) {
    self.image = image
    super.init(nibName: nil, bundle: nil)
    preferredContentSize = image.size
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  override func loadView() {
    let imageView = UIImageView(image: image)
    imageView.contentMode = .scaleAspectFit
    imageView.backgroundColor = .clear
    view = imageView
  }
}
#endif
