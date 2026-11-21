import ExpoModulesCore

public class ItemContextMenuModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ItemContextMenu")

    View(ItemContextMenuView.self) {
      Events("onAction", "onPreviewPress")

      // JSON: a prop Expo fails to convert is dropped without an error.
      Prop("menu") { (view: ItemContextMenuView, json: String) in
        view.setMenu(json)
      }

      Prop("hasPreview") { (view: ItemContextMenuView, hasPreview: Bool) in
        view.hasPreview = hasPreview
      }
    }
  }
}
