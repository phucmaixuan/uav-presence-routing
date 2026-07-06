//Code cho một MVP (minimum viable product)
package models

//Tọa độ 
type Point2D struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

//Vùng request cho USS gửi đến
type GeographicArea struct {
	ShapeType string `json:"shape"` //Mặc định là Polygon
	PointList []Point2D `json:"pointList"`

}


//Footprint (vùng phủ sóng) của một cell
type CellFootprint struct {
	CellID string `json:"cellId"`
	Footprint GeographicArea `json:"coverage"` //Đa giác phủ sóng của cell

}

//Routing decision
type RoutingDecision struct{
	Target string `json:"target"` //Sẽ trả ra AMF, GMLC hay NOT_SERVABLE
	MatchedCellIDs []string `json:"matchedCellIds"` //Nếu Target=AMF thì sẽ trả ra cellId của các cell mà UAV đang ở trong đó
	Reason string `json:"reason"`
}