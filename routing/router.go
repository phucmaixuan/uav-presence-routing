package routing

import (
	//"fmt"
	"fmt"
	"uav-routing/models"
)

const (
	MinCoverageThreshold     = 0.85
	MaxOverCoverageThreshold = 3.00
)

func MakeDecision(reqArea float64, cellArea float64, intersectionArea float64, cellID string) models.RoutingDecision {
	//1.Ngoài vùng phủ sóng
	if intersectionArea <= 0.0 {
		return models.RoutingDecision{
			Target: "NOT_SERVABLE",
			Reason: "Ngoài vùng phủ sóng của cell",
		}
	}

	coverage := intersectionArea / reqArea
	overcoverage := (cellArea - intersectionArea) / reqArea
	fmt.Println(coverage)
	fmt.Println(overcoverage)
	// So khớp với cổng an toàn của AMF
	if coverage >= MinCoverageThreshold && overcoverage <= MaxOverCoverageThreshold {
		return models.RoutingDecision{
			Target:         "TARGET_AMF",
			MatchedCellIDs: []string{cellID},
			Reason:         "Kích thước phù hợp, AMF có thể xử lý an toàn",
		}
	}

	// Nếu không thỏa mãn, đẩy sang hệ thống định vị chuyên sâu
	return models.RoutingDecision{
		Target: "TARGET_GMLC",
		Reason: "Vùng giám sát quá nhỏ hoặc tràn viền quá lớn",
	}
}
