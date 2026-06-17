package routing

import (
	"fmt"
	"uav-routing/models"
)

func MakeDecision(reqArea float64, cellArea float64, intersectionArea float64, cellID string) models.RoutingDecision{
	//1.Ngoài vùng phủ sóng
	if intersectionArea <= 0.0{
		return models.RoutingDecision{
			Target: "NOT_SERVABLE",
			Reason: "Ngoài vùng phủ sóng của cell",
		}
	}
	

}