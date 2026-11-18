import CoreGraphics
import Foundation

@main
enum SubtitleLayoutTests {
    static func near(_ actual: Double, _ expected: Double) {
        precondition(abs(actual - expected) < 0.000001, "\(actual) != \(expected)")
    }

    static func main() throws {
        let style = SubtitleLayout(scale: 1.3, position: 100, marginX: 25, marginY: 30)
        let cases: [(CGSize, CGSize)] = [
            (CGSize(width: 1920, height: 800), CGSize(width: 852, height: 393)),
            (CGSize(width: 1920, height: 1080), CGSize(width: 852, height: 393)),
            (CGSize(width: 1440, height: 1080), CGSize(width: 1920, height: 1080)),
            (CGSize(width: 1920, height: 800), CGSize(width: 393, height: 852)),
            (CGSize(width: 1080, height: 1920), CGSize(width: 852, height: 393)),
        ]
        for (video, viewport) in cases {
            let fit = min(viewport.width / video.width, viewport.height / video.height)
            let fill = max(viewport.width / video.width, viewport.height / video.height)
            let canvas = CGSize(width: video.width * fill, height: video.height * fill)
            let fitted = CGSize(width: video.width * fit, height: video.height * fit)
            // Exercise both source-sized composites and display-sized overlays.
            for reference in [fitted, viewport] {
                let result = style.fitting(canvas: canvas, viewport: viewport, reference: reference)
                let cropX = (canvas.width - viewport.width) / 2
                let cropY = (canvas.height - viewport.height) / 2
                near(result.scale * canvas.height, style.scale * reference.height)
                near(result.marginX / 960 * canvas.width - cropX, style.marginX / 960 * reference.width)
                // Project libass's bottom anchor back through the video crop.
                let margin = result.marginY / 720 * canvas.height * result.scale
                let bottom = (canvas.height - margin) * result.position / 100 - cropY
                near(viewport.height - bottom, style.marginY / 720 * reference.height * style.scale)
                var topStyle = style
                topStyle.alignmentY = "top"
                let top = topStyle.fitting(canvas: canvas, viewport: viewport, reference: reference)
                near(top.marginY / 720 * canvas.height * top.scale - cropY,
                     style.marginY / 720 * reference.height * style.scale)
                // A subsequent fit or PiP layout must restore the saved style.
                let restored = style.fitting(canvas: viewport, viewport: viewport, reference: viewport)
                near(restored.scale, style.scale)
                near(restored.position, style.position)
                near(restored.marginX, style.marginX)
                near(restored.marginY, style.marginY)
            }
        }
        let centered = SubtitleLayout(position: 50).fitting(
            canvas: CGSize(width: 1000, height: 2000),
            viewport: CGSize(width: 1000, height: 1000),
            reference: CGSize(width: 1000, height: 1000)
        )
        near(centered.position, 50)
        let unknown = style.fitting(canvas: .zero, viewport: .zero, reference: .zero)
        near(unknown.scale, style.scale)
        near(unknown.position, style.position)
        try testASSMargins()
        print("PASS: subtitle font size, visible margins, wrapping bounds and fit restoration for both canvas types")
    }

    static func testASSMargins() throws {
        let header = try String(contentsOfFile: "tests/native/Fixtures/viewport.ass", encoding: .utf8)
        let ass = ASSSubtitleLayout(extradata: header)!
        precondition(ass.resolution == CGSize(width: 1920, height: 1080))
        precondition(ass.styles.count == 2)
        // 4:3 video filling a 16:9 screen: 180px cropped at top and bottom.
        let canvas = CGSize(width: 1920, height: 1440)
        let viewport = CGSize(width: 1920, height: 1080)
        let reference = CGSize(width: 1440, height: 1080)
        let overrides = ass.overrides(canvas: canvas, viewport: viewport, reference: reference, position: 100)
        precondition(overrides == ["Dialogue.MarginL=60", "Dialogue.MarginR=90", "Dialogue.MarginV=36",
                                   "Top.MarginL=30", "Top.MarginR=45", "Top.MarginV=153"])
        // Project ASS's authored (unscaled) margins through crop and sub-pos.
        let mappedPosition = 87.5
        let bottom = (1440.0 - 36.0 / 1080 * 1440) * mappedPosition / 100 - 180
        near(1080 - bottom, 42)
        near(153.0 / 1080 * 1440 - 180, 24)
        // Wide video in portrait: text must wrap within the visible sides.
        let portrait = ass.overrides(canvas: CGSize(width: 1920, height: 1080),
                                     viewport: CGSize(width: 480, height: 1080),
                                     reference: CGSize(width: 480, height: 270), position: 100)
        precondition(portrait.contains("Dialogue.MarginL=740"))
        precondition(portrait.contains("Dialogue.MarginR=750"))
        precondition(ass.overrides(canvas: viewport, viewport: viewport, reference: viewport, position: 100).isEmpty)
        precondition(ASSSubtitleLayout(extradata: header)!.overrides(
            canvas: canvas, viewport: viewport, reference: reference, position: 100) == overrides)
        precondition(ASSSubtitleLayout(extradata: "[Script Info]\nPlayResX: nan\n") == nil)
        print("PASS: ASS script-coordinate margins, top/bottom dialogue, wrapping and fit restoration")

        // Below the picture: a 16:9 picture on a portrait phone leaves a tall
        // bar under it; the label sits just below the picture's bottom edge.
        let phone = CGSize(width: 393, height: 852)
        let wide: CGFloat = 16.0 / 9.0
        let portraitFrame = BelowPictureSubtitlePlacement.frame(
            container: phone, videoAspect: wide, bottomInset: 34, lineHeight: 20)!
        let pictureHeight = 393 / wide
        near(Double(portraitFrame.minY), Double((852 + pictureHeight) / 2 + 8))
        near(Double(portraitFrame.width), 393 - 32)
        near(Double(portraitFrame.height), 60)  // capped at three lines
        // The same phone sideways: the picture fills the height, no bar.
        precondition(BelowPictureSubtitlePlacement.frame(
            container: CGSize(width: 852, height: 393), videoAspect: wide,
            bottomInset: 21, lineHeight: 20) == nil)
        // A 2.39:1 film on an iPad Pro in landscape has room for it.
        precondition(BelowPictureSubtitlePlacement.frame(
            container: CGSize(width: 1366, height: 1024), videoAspect: 2.39,
            bottomInset: 20, lineHeight: 30) != nil)
        // Two lines must fit, or subtitles stay in the picture.
        let tight = CGSize(width: 1000, height: 562.5 + 2 * (8 + 2 * 20) - 2)
        precondition(BelowPictureSubtitlePlacement.frame(
            container: tight, videoAspect: wide, bottomInset: 0, lineHeight: 20) == nil)
        precondition(BelowPictureSubtitlePlacement.frame(
            container: phone, videoAspect: 0, bottomInset: 0, lineHeight: 20) == nil)
        precondition(BelowPictureSubtitlePlacement.frame(
            container: phone, videoAspect: .nan, bottomInset: 0, lineHeight: 20) == nil)
        // The font follows the size burned-in subtitles would have, readable.
        near(Double(BelowPictureSubtitlePlacement.fontSize(pictureHeight: 720, scale: 0.5)), 27.5)
        near(Double(BelowPictureSubtitlePlacement.fontSize(pictureHeight: 100, scale: 1)), 15)
        near(Double(BelowPictureSubtitlePlacement.fontSize(pictureHeight: 2000, scale: 1)), 40)
        near(Double(BelowPictureSubtitlePlacement.pictureHeight(container: phone, videoAspect: wide)),
             Double(pictureHeight))
        print("PASS: subtitles below the picture: placement, no-room fallback and font size")

        // Anamorphic video (upstream #1785): a PAL DVD is 720x576 pixels shown
        // at 16:9. Square pixels need nothing.
        near(AnamorphicLayout.displayAspect(width: 720, height: 576, aspect: 16.0 / 9)!, 16.0 / 9)
        precondition(AnamorphicLayout.displayAspect(width: 1920, height: 1080, aspect: 16.0 / 9) == nil)
        precondition(AnamorphicLayout.displayAspect(width: 0, height: 576, aspect: 16.0 / 9) == nil)
        precondition(AnamorphicLayout.displayAspect(width: 720, height: 576, aspect: .nan) == nil)
        // Fitted at its display aspect: a 16:9 picture on a 4:3 iPad, full width.
        let ipad = CGSize(width: 1024, height: 768)
        let fitted = AnamorphicLayout.frame(container: ipad, displayAspect: 16.0 / 9, fill: false)
        near(Double(fitted.width), 1024)
        near(Double(fitted.height), 576)
        near(Double(fitted.minY), 96)
        // Filled: full height, wider than the screen, centred.
        let filled = AnamorphicLayout.frame(container: ipad, displayAspect: 16.0 / 9, fill: true)
        near(Double(filled.height), 768)
        near(Double(filled.width), 768 * 16.0 / 9)
        near(Double(filled.midX), 512)
        print("PASS: anamorphic video at its display aspect, fitted and filled")

        // Black bars baked into the frame (a 2.39:1 film in a 16:9 file).
        // Rows: 0 is black, 1 is picture; 1080 rows with 138 black at each end.
        func rows(top: Int, bottom: Int, total: Int = 1080, picture: Double = 0.4) -> [Double] {
            (0..<total).map { $0 < top || $0 >= total - bottom ? 0.01 : picture }
        }
        let film = BakedLetterbox.barFraction(rowLuma: rows(top: 138, bottom: 138))
        near(film, 138.0 / 1080)
        // Uneven bars are a dark scene, not a letterbox.
        precondition(BakedLetterbox.barFraction(rowLuma: rows(top: 300, bottom: 10)) == 0)
        // A sliver is a crop artefact, not room for subtitles.
        precondition(BakedLetterbox.barFraction(rowLuma: rows(top: 8, bottom: 8)) == 0)
        // A black frame says nothing.
        precondition(BakedLetterbox.barFraction(rowLuma: rows(top: 1080, bottom: 0)) == 0)
        precondition(BakedLetterbox.barFraction(rowLuma: []) == 0)
        // Several samples: a dark scene widens the bars in one of them, so the
        // narrowest wins, and one sample without bars means there are none.
        near(BakedLetterbox.combine([0.128, 0.2, 0.13]), 0.128)
        precondition(BakedLetterbox.combine([0.128, 0, 0.13]) == 0)
        precondition(BakedLetterbox.combine([]) == 0)
        // Below the visible picture: the baked bar adds to the room. A phone
        // held sideways has none under a 16:9 frame (it fills the height), but
        // a 2.39:1 film baked into it leaves its bottom bar for two lines.
        let sideways = CGSize(width: 852, height: 393)
        precondition(BelowPictureSubtitlePlacement.frame(
            container: sideways, videoAspect: wide, bottomInset: 0, lineHeight: 20) == nil)
        let baked = BelowPictureSubtitlePlacement.frame(
            container: sideways, videoAspect: wide, bottomInset: 0, lineHeight: 20,
            bakedBarFraction: 138.0 / 1080)!
        let frameHeight: CGFloat = 393
        let visibleBottom = (393 + frameHeight) / 2 - frameHeight * 138 / 1080
        near(Double(baked.minY), Double(visibleBottom + 8))
        print("PASS: baked-in letterbox detection and placement under the visible picture")
    }
}
