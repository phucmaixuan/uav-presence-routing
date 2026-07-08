package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"uav-routing/models"
	"uav-routing/routing"
	"uav-routing/spatial"

	"github.com/paulmach/orb/planar"
)

func main() {
	//  Đọc file json chứa TOÀN BỘ CÁC TEST CASES
	reqBytes, err := os.ReadFile("data/mock_request.json")
	if err != nil {
		log.Fatalf("Lỗi đọc file request: %v", err)
	}

	cellBytes, err := os.ReadFile("data/mock_cell.json")
	if err != nil {
		log.Fatalf("Lỗi đọc file cell: %v", err)
	}

	// Parse json vào Map (Từ điển các cases)
	var allRequests map[string]models.GeographicArea
	if err := json.Unmarshal(reqBytes, &allRequests); err != nil {
		log.Fatalf("Lỗi parse request map: %v", err)
	}

	// TEST CASE NÀO THÌ SỬA TÊN CASE Ở DÒNG NÀY NÈ:
	// Các lựa chọn: "CASE_AMF", "CASE_GMLC_OVERCOVERAGE", "CASE_GMLC_LOWCOVERAGE", "CASE_OUT_OF_BOUNDS", "CASE_INVALID_BOWTIE",
	//CASE_NOT_ENOUGH_POINTS, CASE_NOT_CLOSED

	selectedCase := "CASE_NOT_CLOSED"

	reqArea, exists := allRequests[selectedCase]
	if !exists {
		log.Fatalf("Không tìm thấy test case tên là: %s", selectedCase)
	}
	fmt.Printf(">> Đang chạy Test Case: %s\n", selectedCase)

	// Parse dữ liệu của Cell
	var cellData models.CellFootprint
	if err := json.Unmarshal(cellBytes, &cellData); err != nil {
		log.Fatalf("Lỗi parse cell: %v", err)
	}
	cellArea := cellData.Footprint

	// Kích hoạt Validation (Fail-fast)
	if err := spatial.ValidatePolygon(reqArea); err != nil {
		fmt.Println("\n KẾT QUẢ ĐỊNH TUYẾN CUỐI CÙNG")
		fmt.Printf("Quyết định: NOT_SERVABLE\n")
		fmt.Printf("Lý do: Lỗi Validation - %v\n", err)
		return // Ngắt chương trình ngay lập tức
	}
	if err := spatial.ValidatePolygon(cellArea); err != nil {
		log.Fatalf("Lỗi dữ liệu hệ thống. Lỗi Cell Area: %v", err)
	}
	fmt.Println(">> Validation OK: Cả hai đa giác đều hợp lệ!")

	// Convert qua dạng hình học của thư viện orb
	reqPolygon := spatial.ConvertToOrbPolygon(reqArea)
	cellPolygon := spatial.ConvertToOrbPolygon(cellArea)

	// Tính toán không gian
	reqAreaSize := planar.Area(reqPolygon)
	cellAreaSize := planar.Area(cellPolygon)

	// Tính diện tích giao cắt (Hiện tại dùng AABB)
	aabbIntersect := spatial.IntersectionArea(reqPolygon, cellPolygon)

	fmt.Printf("Diện tích request: %.8f\n", reqAreaSize)
	fmt.Printf("Diện tích cell: %.8f\n", cellAreaSize)
	fmt.Printf("Diện tích giao cắt: %.8f\n", aabbIntersect)

	// Ra quyết định định tuyến
	decision := routing.MakeDecision(reqAreaSize, cellAreaSize, aabbIntersect, cellData.CellID)

	fmt.Println("\n KẾT QUẢ ĐỊNH TUYẾN CUỐI CÙNG: ")
	fmt.Printf("Quyết định (Target): %s\n", decision.Target)
	fmt.Printf("Lý do (Reason): %s\n", decision.Reason)
	if len(decision.MatchedCellIDs) > 0 {
		fmt.Printf("Danh sách Cell: %v\n", decision.MatchedCellIDs)
	}

}
