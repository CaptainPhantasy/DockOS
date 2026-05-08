import SwiftUI
import WebKit

// MARK: - Command Execution

/// Handles all command types dispatched from the JS layer.
enum CommandExecutor {

    /// Run a shell command silently in the background via /bin/zsh.
    static func runShell(_ command: String) -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-c", command]

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe

        do {
            try process.run()
            // Don't wait — fire and forget for quick commands.
            // For longer-running commands the user should use terminal type.
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            return String(data: data, encoding: .utf8) ?? ""
        } catch {
            return "Error: \(error.localizedDescription)"
        }
    }

    /// Execute an AppleScript via /usr/bin/osascript.
    static func runAppleScript(_ script: String) -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script]

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe

        do {
            try process.run()
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? ""
            return process.terminationStatus == 0 ? output : "Error: \(output)"
        } catch {
            return "Error: \(error.localizedDescription)"
        }
    }

    /// Open Terminal.app and run a multi-line script.
    static func runTerminalScript(_ script: String) -> String {
        // Write the script to a temp file so multiline and quoting are preserved.
        let tmpDir = FileManager.default.temporaryDirectory
        let tmpFile = tmpDir.appendingPathComponent("streamdock_\(Int(Date().timeIntervalSince1970)).sh")

        do {
            try script.write(to: tmpFile, atomically: true, encoding: .utf8)
            // Make it executable
            try FileManager.default.setAttributes(
                [.posixPermissions: 0o755],
                ofItemAtPath: tmpFile.path
            )
        } catch {
            return "Error writing temp script: \(error.localizedDescription)"
        }

        // Use osascript to tell Terminal to run the script file.
        // This opens Terminal.app and runs the script in a new window.
        let appleScript = """
        tell application "Terminal"
            activate
            do script "bash '\(tmpFile.path)'"
        end tell
        """
        return runAppleScript(appleScript)
    }

    /// Open a URL in the default browser / handler.
    static func openURL(_ urlString: String) -> String {
        guard let url = URL(string: urlString) else {
            return "Error: Invalid URL — \(urlString)"
        }
        NSWorkspace.shared.open(url)
        return "Opened: \(urlString)"
    }

    /// Dispatch a command from the JS bridge.
    /// - Parameter payload: JSON with "type" (shell|applescript|terminal|url) and "command" (string).
    /// - Returns: Result string sent back to JS.
    static func execute(type: String, command: String) -> String {
        let trimmed = command.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return "Error: Empty command"
        }

        switch type {
        case "shell":
            return runShell(trimmed)
        case "applescript":
            return runAppleScript(trimmed)
        case "terminal":
            return runTerminalScript(trimmed)
        case "url":
            return openURL(trimmed)
        default:
            return "Error: Unknown command type '\(type)'"
        }
    }
}

// MARK: - Message Handler

/// Receives messages from the JS layer via window.webkit.messageHandlers.streamDock.postMessage(...)
class StreamDockBridge: NSObject, WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "streamDock" else { return }

        // Parse the JSON payload
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String,
              let command = body["command"] as? String else {
            print("[StreamDock] Invalid bridge payload: \(message.body)")
            return
        }

        // Execute on a background thread so we don't block the UI
        DispatchQueue.global(qos: .userInitiated).async {
            let result = CommandExecutor.execute(type: type, command: command)
            print("[StreamDock] \(type): \(command.prefix(100)) → \(result.prefix(200))")
        }
    }
}

// MARK: - WebView

struct StreamDockWebView: NSViewRepresentable {
    let htmlURL: URL

    func makeCoordinator() -> StreamDockBridge {
        StreamDockBridge()
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // Inject native flag
        let flagScript = WKUserScript(
            source: "window.__STREAMDOCK_NATIVE__ = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(flagScript)

        // Register the command bridge
        config.userContentController.add(context.coordinator, name: "streamDock")

        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.setValue(false, forKey: "drawsBackground")
        webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}
}

// MARK: - Popover Content

struct PopoverContent: View {
    let htmlURL: URL

    var body: some View {
        StreamDockWebView(htmlURL: htmlURL)
            .frame(width: 400, height: 600)
    }
}

// MARK: - App

@main
struct StreamDockMenuBarApp: App {
    @State private var popover: NSPopover?

    var body: some Scene {
        MenuBarExtra("StreamDock", systemImage: "bolt.fill") {
            PopoverContent(htmlURL: Self.htmlURL)
                .frame(width: 400, height: 600)
        }
        .menuBarExtraStyle(.window)
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("About StreamDock") {
                    NSApplication.shared.orderFrontStandardAboutPanel(
                        options: [
                            NSApplication.AboutPanelOptionKey.applicationName: "StreamDock",
                            NSApplication.AboutPanelOptionKey.version: "1.0.0",
                        ]
                    )
                }
            }
            CommandGroup(replacing: .newItem) {}
        }
    }

    static let htmlURL: URL = {
        let bundle = Bundle.main.bundleURL
        let resourceURL = bundle.appendingPathComponent("Contents/Resources/index.html")

        if FileManager.default.fileExists(atPath: resourceURL.path) {
            return resourceURL
        }

        let sourceDist = URL(fileURLWithPath: "/Volumes/SanDisk1Tb/Dock/glassmorphic-llm-command-dock/dist/index.html")
        if FileManager.default.fileExists(atPath: sourceDist.path) {
            return sourceDist
        }

        fatalError("Cannot find index.html — checked bundle Resources and source dist/")
    }()
}
