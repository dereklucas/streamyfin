#if os(iOS)
import UIKit

/// Plain-text subtitles drawn below the picture, in the letterbox under an
/// aspect-fit video, instead of burned in over it. Styled after the user's
/// subtitle settings: their text color, and their background box or, without
/// one, mpv's outline. The view controller places it (see
/// `BelowPictureSubtitlePlacement`) and decides when it is used.
final class BelowPictureSubtitleView: UIView {
	private let label = UILabel()

	/// "#RRGGBB" from the settings; white without one.
	var textColorHex: String? { didSet { restyle() } }
	/// "#AARRGGBB" (mpv's order) from the settings; empty or nil for none.
	var backgroundHex: String? { didSet { restyle() } }
	var fontSize: CGFloat = 17 { didSet { restyle() } }
	var text: String? { didSet { restyle() } }

	override init(frame: CGRect) {
		super.init(frame: frame)
		isUserInteractionEnabled = false
		label.numberOfLines = Int(BelowPictureSubtitlePlacement.maximumLines)
		label.textAlignment = .center
		label.lineBreakMode = .byTruncatingTail
		addSubview(label)
		restyle()
	}

	@available(*, unavailable)
	required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

	override func layoutSubviews() {
		super.layoutSubviews()
		// Top-aligned in its box, just under the picture, as wide as it needs.
		let fitting = label.sizeThatFits(CGSize(width: bounds.width, height: bounds.height))
		let width = min(bounds.width, fitting.width + horizontalPadding * 2)
		let height = min(bounds.height, fitting.height + verticalPadding * 2)
		label.frame = CGRect(
			x: (bounds.width - width) / 2, y: 0, width: width, height: height)
	}

	private var hasBackground: Bool { Self.color(hex: backgroundHex) != nil }
	private var horizontalPadding: CGFloat { hasBackground ? fontSize * 0.4 : 0 }
	private var verticalPadding: CGFloat { hasBackground ? fontSize * 0.15 : 0 }

	private func restyle() {
		let font = UIFont.systemFont(ofSize: fontSize, weight: .semibold)
		let color = Self.color(hex: textColorHex) ?? .white
		var attributes: [NSAttributedString.Key: Any] = [
			.font: font,
			.foregroundColor: color,
		]
		if let background = Self.color(hex: backgroundHex) {
			label.backgroundColor = background
			label.layer.cornerRadius = fontSize * 0.2
			label.layer.masksToBounds = true
		} else {
			// mpv's default look: a dark outline and shadow, readable on
			// whatever is behind (here, black bars, usually).
			label.backgroundColor = .clear
			label.layer.masksToBounds = false
			attributes[.strokeColor] = UIColor.black
			attributes[.strokeWidth] = -3.0
			let shadow = NSShadow()
			shadow.shadowColor = UIColor.black.withAlphaComponent(0.8)
			shadow.shadowOffset = CGSize(width: 0, height: 1)
			shadow.shadowBlurRadius = 2
			attributes[.shadow] = shadow
		}
		label.attributedText = text.map { NSAttributedString(string: $0, attributes: attributes) }
		isHidden = text == nil
		setNeedsLayout()
	}

	/// "#RRGGBB" or "#AARRGGBB"; nil for anything else (empty included).
	static func color(hex: String?) -> UIColor? {
		guard var digits = hex?.trimmingCharacters(in: .whitespaces), !digits.isEmpty else {
			return nil
		}
		if digits.hasPrefix("#") { digits.removeFirst() }
		guard digits.count == 6 || digits.count == 8,
			let value = UInt64(digits, radix: 16)
		else { return nil }
		let alpha = digits.count == 8 ? CGFloat((value >> 24) & 0xFF) / 255 : 1
		return UIColor(
			red: CGFloat((value >> 16) & 0xFF) / 255,
			green: CGFloat((value >> 8) & 0xFF) / 255,
			blue: CGFloat(value & 0xFF) / 255,
			alpha: alpha)
	}
}
#endif
