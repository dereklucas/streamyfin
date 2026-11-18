import Foundation

/// The keys the native player answers on a hardware keyboard.
enum PlayerKey: Equatable {
	case space
	case leftArrow
	case rightArrow
	case escape
	/// A printable key as typed, Shift applied: "k", "<", "7".
	case character(Character)
}

enum PlayerKeyAction: Equatable {
	case togglePlayPause
	case seekBackward
	case seekForward
	case toggleMute
	case playNextEpisode
	case close
	case speedDown
	case speedUp
	/// 0 to 0.9 of the duration, from the digit keys, as YouTube's.
	case seekToFraction(Double)
}

/// What is on screen when a key arrives, as far as the keyboard cares.
struct PlayerKeyboardState: Equatable {
	/// A prompt, a sheet, the lock mode or the error overlay is up. It owns
	/// every key, as it owns the touches: nothing may resume or move playback
	/// under it.
	var overlayOwnsInput = false
	/// The subtitle size panel is up. It is not modal, the controls under it
	/// keep working, but its slider takes the arrows.
	var subtitleScaleShown = false
	/// A finger is on the scrubber, and a key would fight the drag.
	var isScrubbing = false
	/// The stream is loaded and has a duration. Between two episodes it has
	/// neither, and a seek sent then lands in the next one.
	var canSeek = true
	/// In SyncPlay a seek is a request to the group.
	var syncPlayActive = false
	/// There is a next episode to go to (the group's, in SyncPlay).
	var hasNextEpisode = false
}

/// Kept free of UIKit so `scripts/ios/test-player-keyboard-policy.sh` can run
/// it on macOS.
enum PlayerKeyboardPolicy {
	/// Whether the arrows are key commands, which repeat while held. In
	/// SyncPlay each repeat would ask the group for the same target until it
	/// answers, so the arrows are presses there, one seek per press.
	static func registersArrowCommands(in state: PlayerKeyboardState) -> Bool {
		!state.syncPlayActive && arrowsSeek(in: state)
	}

	/// What a key command does when it fires. A repeat fires from the command
	/// the arrow went down with, so each one is checked against the state of
	/// that moment.
	static func commandAction(for key: PlayerKey, in state: PlayerKeyboardState) -> PlayerKeyAction? {
		guard registersArrowCommands(in: state) else { return nil }
		return seekAction(for: key)
	}

	/// What a key press does, or nil to send it up the responder chain. A
	/// press with Shift, Control, Option or Command is someone else's shortcut.
	/// For a character key, `modified` is Control, Option or Command only:
	/// Shift is how "<" and ">" are typed.
	static func pressAction(for key: PlayerKey, modified: Bool, in state: PlayerKeyboardState) -> PlayerKeyAction? {
		guard !modified, !state.overlayOwnsInput, !state.isScrubbing else { return nil }
		switch key {
		case .escape:
			return .close
		case let .character(character):
			return characterAction(for: character, in: state)
		case .space:
			// A press fires once, so a held space bar toggles once.
			return .togglePlayPause
		case .leftArrow, .rightArrow:
			// Outside SyncPlay the key command takes the arrows.
			guard state.syncPlayActive, arrowsSeek(in: state) else { return nil }
			return seekAction(for: key)
		}
	}

	/// The speeds the speed menu offers, which < and > step through.
	static let speedSteps: [Double] = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

	/// The next speed down or up from this one; a speed between two steps
	/// (a press-and-hold rate, a remote's choice) goes to the nearest step
	/// that way. Nil past either end.
	static func nextSpeed(from speed: Double, up: Bool) -> Double? {
		up
			? speedSteps.first { $0 > speed + 0.001 }
			: speedSteps.last { $0 < speed - 0.001 }
	}

	/// YouTube's letters: K plays and pauses, J and L seek, M mutes, N goes to
	/// the next episode, < and > change the speed, and 0 to 9 jump to that
	/// tenth of the video. Letters are matched in either case.
	private static func characterAction(for character: Character, in state: PlayerKeyboardState) -> PlayerKeyAction? {
		let canSeek = state.canSeek
		switch character.lowercased() {
		case "k": return .togglePlayPause
		// Presses, so one seek per press: in SyncPlay too, through the group.
		case "j": return canSeek ? .seekBackward : nil
		case "l": return canSeek ? .seekForward : nil
		case "m": return .toggleMute
		case "n": return state.hasNextEpisode ? .playNextEpisode : nil
		// The group sets the speed in SyncPlay.
		case "<": return state.syncPlayActive ? nil : .speedDown
		case ">": return state.syncPlayActive ? nil : .speedUp
		default:
			guard character.isASCII, let value = character.wholeNumberValue else { return nil }
			return canSeek ? .seekToFraction(Double(value) / 10) : nil
		}
	}

	private static func arrowsSeek(in state: PlayerKeyboardState) -> Bool {
		!state.overlayOwnsInput && !state.subtitleScaleShown && !state.isScrubbing && state.canSeek
	}

	private static func seekAction(for key: PlayerKey) -> PlayerKeyAction? {
		switch key {
		case .leftArrow: return .seekBackward
		case .rightArrow: return .seekForward
		case .space, .escape, .character: return nil
		}
	}
}
