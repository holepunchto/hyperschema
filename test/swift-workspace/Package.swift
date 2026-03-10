// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "HyperschemaTest",
  platforms: [.macOS(.v11), .iOS(.v14)],
  dependencies: [
    .package(url: "https://github.com/holepunchto/compact-encoding-swift", branch: "main")
  ],
  targets: [
    .executableTarget(
      name: "HyperschemaTest",
      dependencies: [.product(name: "CompactEncoding", package: "compact-encoding-swift")],
      path: "Sources"
    )
  ]
)
