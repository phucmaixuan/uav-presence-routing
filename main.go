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
	//Đọc file json
	reqBytes, err := os.ReadFile("data/mock_request.json")
	if err != nil {
		log.Fatalf("Lỗi đọc file request: %v", err)
	}

	cellBytes, err := os.ReadFile("data/mock_cell.json")
	if err != nil {
		log.Fatalf("Lỗi đọc file cell: %v", err)
	}

	//Parse json vào struct
	var reqArea models.GeographicArea
	
	//Đọc dữ liệu từ file json vào struct
	if err := json.Unmarshal(reqBytes, &reqArea); err != nil {
		log.Fatalf("Lỗi parse request: %v", err)
	}

	var cellData models.CellFootprint
	if err := json.Unmarshal(cellBytes, &cellData); err != nil {
		log.Fatalf("Lỗi parse cell: %v", err)
	}
	cellArea := cellData.Footprint
	fmt.Printf("Request Area ok: %s\n", reqArea.ShapeType)
	fmt.Printf("Cell Area ok: %s\n", cellArea.ShapeType)

	//Validate polygon
	if err := spatial.ValidatePolygon(reqArea); err != nil {
		log.Fatalf("Request polygon không hợp lệ: %v", err)
	}
	fmt.Println("Request polygon hợp lệ")

	//Convert qua dạng hình học của thư viện orb
	reqPolygon := spatial.ConvertToOrbPolygon(reqArea)
	cellPolygon := spatial.ConvertToOrbPolygon(cellArea)

	//Tính diện tích (dùng planar.Area)
	reqAreaSize := planar.Area(reqPolygon)
	cellAreaSize := planar.Area(cellPolygon)
	
	fmt.Printf("Diện tích request: %f\n", reqAreaSize)
	fmt.Printf("Diện tích cell: %f\n", cellAreaSize)

	//Tính diện tích phần giao
	intersectionArea :=  spatial.IntersectionArea(reqPolygon, cellPolygon)
	fmt.Printf("Diện tích giao: %f\n", intersectionArea)

	//Quyết định định tuyến
	decision := routing.MakeDecision(reqAreaSize, cellAreaSize, intersectionArea, cellData.CellID)
	fmt.Printf("Quyết định định tuyến: %s\n", decision.Target)
}
