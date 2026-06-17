package spatial
import (
	"uav-routing/models"
	"github.com/paulmach/orb"
)

func ConvertToOrbPolygon(area models.GeogpraphicArea) orb.Polygon{
	//Khởi tạo một Ring(là vòng khép kín) để chứa các điểm
	ring := make(orb.Ring, 0, len(area.PointList))

	for _, pt := range area.PointList{
		ring = append(ring, orb.Point{pt.Lon, pt.Lat})
	}
	//Một polygon có thể chứa nhiều ring, nhưng mà đang làm trường hợp nhỏ nhất nên chứa một ring thôi
	return orb.Polygon{ring}
}

func IntersectionArea(polyA, polyB orb.Polygon) float64{
	boundA := polyA.Bound() //trả về cái Bound xung quanh polygon
	boundB := polyB.Bound()
	
	 
	minLon := max(boundA.Min[0], boundB.Min[0])
	maxLon := min(boundA.Max[0], boundB.Max[0])
	minLat := max(boundA.Min[1], boundB.Min[1])
	maxLat := min(boundA.Max[1], boundB.Max[1])

	length := maxLon - minLon
	height := maxLat - minLat
	
	if minLon < maxLon && minLat < maxLat {
		return length * height
	}
	return 0.0
}