// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "HyperschemaTest",
  platforms: [.macOS(.v11)],
  dependencies: [
    .package(url: "https://github.com/holepunchto/compact-encoding-swift", revision: "baff96a1762ae46b9aeb528eaaa391ffb56b50b7")
  ],
  targets: [
    .executableTarget(
      name: "HyperschemaTest",
      dependencies: [.product(name: "CompactEncoding", package: "compact-encoding-swift")],
      path: "Sources"
    )
  ]
)
