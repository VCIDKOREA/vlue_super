import UIKit
import Vision

/// Android ML Kit OCR 과 동일 계약 — data URL → 한글 빌지 텍스트
enum PosBillVisionOcr {
    static func recognizeFromDataUrl(_ dataUrl: String) -> String {
        guard let image = decodeDataUrlImage(dataUrl),
              let cgImage = image.cgImage else {
            return ""
        }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["ko-KR", "en-US"]
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
            try handler.perform([request])
            let lines = (request.results ?? [])
                .compactMap { $0.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            return lines.joined(separator: "\n")
        } catch {
            NSLog("[PosBillVisionOcr] failed: %@", error.localizedDescription)
            return ""
        }
    }

    private static func decodeDataUrlImage(_ dataUrl: String) -> UIImage? {
        let trimmed = dataUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let comma = trimmed.firstIndex(of: ",") else { return nil }
        let b64 = String(trimmed[trimmed.index(after: comma)...])
        guard let data = Data(base64Encoded: b64, options: .ignoreUnknownCharacters) else { return nil }
        return UIImage(data: data)
    }
}
