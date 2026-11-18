import CoreGraphics
import Foundation

/// Ordinary subtitle layout expressed independently of the renderer/platform.
/// All sizes describe rectangles on the screen, in the same units:
/// - canvas: the full rendered subtitle canvas, including offscreen pixels
/// - viewport: the clipping player bounds
/// - reference: the subtitle canvas before video zoom
struct SubtitleLayout {
    var scale: Double = 1
    var position: Double = 100
    var marginX: Double = 25
    var marginY: Double = 22
    var alignmentY: String = "bottom"

    func fitting(canvas: CGSize, viewport: CGSize, reference: CGSize) -> SubtitleLayout {
        guard [canvas.width, canvas.height, viewport.width, viewport.height,
               reference.width, reference.height].allSatisfy({ $0.isFinite && $0 > 0 }) else { return self }

        let visibleWidth = Double(min(1, viewport.width / canvas.width))
        let visibleHeight = Double(min(1, viewport.height / canvas.height))
        let mappedPosition = 50 + (position - 50) * visibleHeight
        let mappedScale = scale * Double(reference.height / canvas.height)
        let mappedMarginY: Double
        if alignmentY == "top", mappedScale > 0 {
            // Top-aligned text ignores libass line_position; inset the cropped
            // top edge directly, keeping the visible user margin unchanged.
            let croppedTop = Double(max(0, canvas.height - viewport.height) / 2)
            mappedMarginY = marginY + croppedTop * 720 / (Double(canvas.height) * mappedScale)
        } else {
            mappedMarginY = mappedPosition > 0 ? marginY * position / mappedPosition : marginY
        }
        return SubtitleLayout(
            scale: mappedScale,
            position: mappedPosition,
            // MPV's converted-text margins use a 960x720 reference. Reserve
            // the cropped sides as well as the requested visible text margin.
            marginX: (1 - visibleWidth) * 480 + marginX * Double(reference.width / canvas.width),
            // libass applies line_position after subtracting its bottom margin.
            marginY: mappedMarginY,
            alignmentY: alignmentY
        )
    }
}

/// Native ASS margins are script coordinates, not MPV's 960x720 text margins.
/// Read original codec metadata so repeated zooms never transform an override.
struct ASSSubtitleLayout {
    struct Style {
        var name: String
        var left: Double
        var right: Double
        var vertical: Double
        var alignment: Int
    }

    var resolution: CGSize
    var styles: [Style]

    init?(extradata: String) {
        var section = ""
        var fields: [String] = []
        var width = 0.0, height = 0.0
        var parsed: [Style] = []
        for raw in extradata.components(separatedBy: .newlines) {
            let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.hasPrefix("[") { section = line.lowercased(); continue }
            guard let colon = line.firstIndex(of: ":") else { continue }
            let key = line[..<colon].trimmingCharacters(in: .whitespaces).lowercased()
            let value = String(line[line.index(after: colon)...]).trimmingCharacters(in: .whitespaces)
            if section == "[script info]" {
                if key == "playresx" { width = Double(value) ?? 0 }
                if key == "playresy" { height = Double(value) ?? 0 }
            } else if section == "[v4+ styles]" || section == "[v4 styles]" {
                if key == "format" {
                    fields = value.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
                } else if key == "style" {
                    let values = value.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }
                    guard values.count == fields.count else { continue }
                    func field(_ name: String) -> String? {
                        fields.firstIndex(of: name).map { values[$0] }
                    }
                    guard let name = field("name"), !name.isEmpty,
                          let left = field("marginl").flatMap(Double.init),
                          let right = field("marginr").flatMap(Double.init),
                          let vertical = field("marginv").flatMap(Double.init),
                          let alignment = field("alignment").flatMap(Int.init),
                          [left, right, vertical].allSatisfy({ $0.isFinite && $0 >= 0 && $0 <= Double(Int32.max) }) else { continue }
                    // SSA uses a different top/center alignment numbering.
                    let normalized = section == "[v4 styles]"
                        ? ([5, 6, 7].contains(alignment) ? 8 : ([9, 10, 11].contains(alignment) ? 5 : 2))
                        : alignment
                    parsed.append(Style(name: name, left: left, right: right, vertical: vertical, alignment: normalized))
                }
            }
        }
        guard [width, height].allSatisfy({ $0.isFinite && $0 > 0 && $0 <= Double(Int32.max) }),
              !parsed.isEmpty else { return nil }
        resolution = CGSize(width: width, height: height)
        styles = parsed
    }

    func overrides(canvas: CGSize, viewport: CGSize, reference: CGSize, position: Double) -> [String] {
        guard [canvas.width, canvas.height, viewport.width, viewport.height,
               reference.width, reference.height].allSatisfy({ $0.isFinite && $0 > 0 }),
              canvas.width > viewport.width || canvas.height > viewport.height else { return [] }
        let cropX = Double(max(0, canvas.width - viewport.width) / (2 * canvas.width))
        let cropY = Double(max(0, canvas.height - viewport.height) / (2 * canvas.height))
        let ratioX = Double(reference.width / canvas.width)
        let ratioY = Double(reference.height / canvas.height)
        let mappedPosition = 50 + (position - 50) * Double(min(1, viewport.height / canvas.height))
        return styles.flatMap { style -> [String] in
            let left = cropX * resolution.width + style.left * ratioX
            let right = cropX * resolution.width + style.right * ratioX
            let vertical: Double
            if style.alignment >= 7 {
                vertical = cropY * resolution.height + style.vertical * ratioY
            } else if style.alignment <= 3 && mappedPosition > 0 {
                vertical = style.vertical * ratioY * position / mappedPosition
            } else {
                vertical = style.vertical * ratioY
            }
            return ["\(style.name).MarginL=\(Int(left.rounded()))",
                    "\(style.name).MarginR=\(Int(right.rounded()))",
                    "\(style.name).MarginV=\(Int(vertical.rounded()))"]
        }
    }
}

/// Where plain-text subtitles go when they are drawn below the picture, in
/// the letterbox under it, rather than over it: the screen's own black bars,
/// outside the video frame, which burned-in subtitles cannot reach.
struct BelowPictureSubtitlePlacement {
    /// Lines the bar must hold before subtitles move into it.
    static let minimumLines: CGFloat = 2
    /// Most lines the label shows.
    static let maximumLines: CGFloat = 3
    /// Space between the picture's bottom edge and the text.
    static let gap: CGFloat = 8
    /// Horizontal inset from the screen edges.
    static let sideMargin: CGFloat = 16

    /// The label's frame, or nil when the bar under an aspect-fit picture is
    /// too short for `minimumLines` lines (a phone held sideways, an iPad
    /// playing 4:3) and subtitles stay in the picture.
    ///
    /// `bakedBarFraction` is the share of the frame's height that is black at
    /// each end inside the frame (see `BakedLetterbox`): the visible picture
    /// ends that much higher, and its bar adds to the room under it.
    static func frame(
        container: CGSize,
        videoAspect: CGFloat,
        bottomInset: CGFloat,
        lineHeight: CGFloat,
        bakedBarFraction: CGFloat = 0
    ) -> CGRect? {
        guard [container.width, container.height, videoAspect, lineHeight]
            .allSatisfy({ $0.isFinite && $0 > 0 }),
            bottomInset.isFinite, bottomInset >= 0
        else { return nil }

        let pictureWidth = min(container.width, container.height * videoAspect)
        let pictureHeight = pictureWidth / videoAspect
        let bar = bakedBarFraction.isFinite ? min(max(bakedBarFraction, 0), 0.4) : 0
        let pictureBottom = (container.height + pictureHeight) / 2 - pictureHeight * bar
        let top = pictureBottom + gap
        let available = container.height - bottomInset - top
        guard available >= lineHeight * minimumLines else { return nil }

        return CGRect(
            x: sideMargin,
            y: top,
            width: container.width - sideMargin * 2,
            height: min(available, lineHeight * maximumLines)
        )
    }

    /// The label's font size: the size burned-in subtitles would have on this
    /// picture (mpv's default 55 at a 720-line reference, times the user's
    /// scale), kept readable.
    static func fontSize(pictureHeight: CGFloat, scale: CGFloat) -> CGFloat {
        guard pictureHeight.isFinite, pictureHeight > 0, scale.isFinite, scale > 0
        else { return 17 }
        return min(max(55 / 720 * pictureHeight * scale, 15), 40)
    }

    /// The picture's height when aspect-fit into the container.
    static func pictureHeight(container: CGSize, videoAspect: CGFloat) -> CGFloat {
        guard container.width > 0, container.height > 0, videoAspect > 0 else { return 0 }
        return min(container.width, container.height * videoAspect) / videoAspect
    }
}

/// Black bars baked into the video frame: a 2.39:1 film encoded at 16:9 has
/// black rows above and below the picture, inside the frame, where the
/// window's own bars cannot tell. Read from a few frames' rows of brightness.
enum BakedLetterbox {
    /// Brightness (0...1) under which a row counts as black. Encoders leave
    /// "black" a little above zero.
    static let blackRow = 0.06
    /// Bars thinner than this share of the frame are a crop artefact.
    static let minimumBar = 0.03
    /// How unequal the two bars may be and still be a letterbox.
    static let symmetryTolerance = 0.02

    /// The share of the frame's height that is black at each end, or 0 when
    /// this frame has no letterbox: no bars, uneven bars (a dark scene), or a
    /// frame black throughout.
    static func barFraction(rowLuma: [Double]) -> Double {
        let total = rowLuma.count
        guard total > 0 else { return 0 }
        let top = rowLuma.prefix { $0 < blackRow }.count
        guard top < total else { return 0 }
        let bottom = rowLuma.reversed().prefix { $0 < blackRow }.count
        let topShare = Double(top) / Double(total)
        let bottomShare = Double(bottom) / Double(total)
        guard abs(topShare - bottomShare) <= symmetryTolerance,
            min(topShare, bottomShare) >= minimumBar
        else { return 0 }
        return min(topShare, bottomShare)
    }

    /// Several frames' answers as one: a dark scene widens the bars in one
    /// frame, so the narrowest wins, and a frame without bars means the video
    /// has none.
    static func combine(_ samples: [Double]) -> Double {
        guard !samples.isEmpty, samples.allSatisfy({ $0 > 0 }) else { return 0 }
        return samples.min() ?? 0
    }
}
