// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VlueLettering",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "VlueLettering", targets: ["VlueLettering"]),
        .executable(name: "VlueHost", targets: ["VlueHost"])
    ],
    targets: [
        .target(
            name: "VlueLettering",
            path: "Sources"
        ),
        .executableTarget(
            name: "VlueHost",
            dependencies: ["VlueLettering"],
            path: "VlueHost"
        )
    ]
)
