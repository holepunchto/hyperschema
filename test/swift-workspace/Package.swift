// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "HyperschemaTest",
  platforms: [.macOS(.v11)],
  dependencies: [
    .package(url: "https://github.com/holepunchto/compact-encoding-swift", revision: "39906945d02d0cacb3ac59e52b5efb6d463566db")
  ],
  targets: [
    .executableTarget(
      name: "HyperschemaTest",
      dependencies: [.product(name: "CompactEncoding", package: "compact-encoding-swift")],
      path: "Sources"
    )
  ]
)
