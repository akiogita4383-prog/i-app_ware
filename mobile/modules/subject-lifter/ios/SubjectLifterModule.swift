import CoreImage
import ExpoModulesCore
import UIKit
import Vision

/// 写真から服（被写体）だけを切り抜いて透過PNGで返す。
/// iOS 17 の VNGenerateForegroundInstanceMaskRequest（写真アプリの「被写体を持ち上げる」と同じ仕組み）を使う。
public class SubjectLifterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SubjectLifter")

    Function("isSupported") { () -> Bool in
      if #available(iOS 17.0, *) {
        return true
      }
      return false
    }

    AsyncFunction("liftAsync") { (uri: String) throws -> [String: Any] in
      guard #available(iOS 17.0, *) else {
        throw UnsupportedOSException()
      }
      guard let url = URL(string: uri),
            let input = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]) else {
        throw ImageLoadException()
      }

      let handler = VNImageRequestHandler(ciImage: input, options: [:])
      let request = VNGenerateForegroundInstanceMaskRequest()
      try handler.perform([request])

      guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
        throw NoSubjectException()
      }

      let buffer = try observation.generateMaskedImage(
        ofInstances: observation.allInstances,
        from: handler,
        croppedToInstancesExtent: true
      )
      let masked = CIImage(cvPixelBuffer: buffer)
      let context = CIContext()
      guard let cgImage = context.createCGImage(masked, from: masked.extent),
            let png = UIImage(cgImage: cgImage).pngData() else {
        throw ImageWriteException()
      }

      let outURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("lift-\(UUID().uuidString).png")
      try png.write(to: outURL)

      return [
        "uri": outURL.absoluteString,
        "width": cgImage.width,
        "height": cgImage.height,
      ]
    }
  }
}

internal final class UnsupportedOSException: Exception {
  override var reason: String { "背景除去には iOS 17 以上が必要です" }
}

internal final class ImageLoadException: Exception {
  override var reason: String { "画像を読み込めませんでした" }
}

internal final class NoSubjectException: Exception {
  override var reason: String { "写真から服を見つけられませんでした" }
}

internal final class ImageWriteException: Exception {
  override var reason: String { "切り抜いた画像を保存できませんでした" }
}
