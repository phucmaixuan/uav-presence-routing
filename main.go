package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"uav-routing/models"
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
	var reqArea models.GeogpraphicArea
	
	//Đọc dữ liệu từ file json vào struct
	if err := json.Unmarshal(reqBytes, &reqArea); err != nil {
		log.Fatalf("Lỗi parse request: %v", err)
	}

	var cellArea models.GeogpraphicArea
	if err := json.Unmarshal(cellBytes, &cellArea); err != nil {
		log.Fatalf("Lỗi parse cell: %v", err)
	}
	fmt.Printf("Request Area ok: %s\n", reqArea.ShapeType)
	fmt.Printf("Cell Area ok: %s\n", cellArea.ShapeType)

	//Convert qua dạng hình học của thư viện orb
	reqPolygon := spatial.ConvertToOrbPolygon(reqArea)
	cellPolygon := spatial.ConvertToOrbPolygon(cellArea)

	//Tính diện tích (dùng planar.Area)
	reqAreaSize := planar.Area(reqPolygon)
	cellAreaSize := planar.Area(cellPolygon)
	
	fmt.Printf("Diện tích request: %f\n", reqAreaSize)
	fmt.Printf("Diện tích cell: %f\n", cellAreaSize)
}
