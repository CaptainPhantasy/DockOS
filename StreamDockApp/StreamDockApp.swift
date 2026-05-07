import SwiftUI
import WebKit

// MARK: - WebView

struct StreamDockWebView: NSViewRepresentable {
    let htmlURL: URL

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // Inject a flag so the SPA knows it's running in the native wrapper
        let script = WKUserScript(
            source: "window.__STREAMDOCK_NATIVE__ = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(script)
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
        // Look for the HTML next to the app bundle, then in the source dist/
        let bundle = Bundle.main.bundleURL
        let resourceURL = bundle.appendingPathComponent("Contents/Resources/index.html")

        if FileManager.default.fileExists(atPath: resourceURL.path) {
            return resourceURL
        }

        // Fallback: source dist directory
        let sourceDist = URL(fileURLWithPath: "/Volumes/SanDisk1Tb/Dock/glassmorphic-llm-command-dock/dist/index.html")
        if FileManager.default.fileExists(atPath: sourceDist.path) {
            return sourceDist
        }

        fatalError("Cannot find index.html — checked bundle Resources and source dist/")
    }()
}
