package spatial

import (
	"errors"
	"uav-routing/models"

	"github.com/paulmach/orb"
)

// Hàm phụ trợ
// orientation: Hướng rẽ của 3 điểm P, Q, R
func Orientation(p, q, r models.Point2D) int {
	val := (q.Lat-p.Lat)*(r.Lon-q.Lon) - (q.Lon-p.Lon)*(r.Lat-q.Lat)
	if val == 0 {
		return 0 //Thẳng hàng
	}
	if val > 0 {
		return 1 //Rẽ phải
	}
	return 2 //Rẽ trái
}

func doIntersect(p1, q1, p2, q2 models.Point2D) bool {
	o1 := Orientation(p1, q1, p2)
	o2 := Orientation(p1, q1, q2)
	o3 := Orientation(p2, q2, p1)
	o4 := Orientation(p2, q2, q1)
	if o1 != o2 && o3 != o4 {
		return true
	}
	return false
}

func ValidatePolygon(area models.GeographicArea) error {
	points := area.PointList
	n := len(points)
	//Check số điểm tối thiểu
	if n < 4 {
		return errors.New("Không thỏa mãn là Polygon, cần ít nhất 4 điểm")
	}

	//Check khép kín
	firstPoint := points[0]
	lastPoint := points[n-1]
	if firstPoint.Lat != lastPoint.Lat || firstPoint.Lon != lastPoint.Lon {
		return errors.New("Polygon chưa khép kín")
	}

	//Check tự cắt
	for i := 0; i < n-1; i++ {
		for j := i + 2; j < n-1; j++ {
			if i == 0 && j == n-2 {
				continue
			}
			if doIntersect(points[i], points[i+1], points[j], points[j+1]) {
				return errors.New("Đa giác tự cắt chính nó")
			}
		}
	}
	return nil

}

func ConvertToOrbPolygon(area models.GeographicArea) orb.Polygon {
	//Khởi tạo một Ring(là vòng khép kín) để chứa các điểm
	ring := make(orb.Ring, 0, len(area.PointList))

	for _, pt := range area.PointList {
		ring = append(ring, orb.Point{pt.Lon, pt.Lat})
	}
	//Một polygon có thể chứa nhiều ring, nhưng mà đang làm trường hợp nhỏ nhất nên chứa một ring thôi
	return orb.Polygon{ring}
}

func IntersectionArea(polyA, polyB orb.Polygon) float64 { //Dựa theo bounding box (có sai số)
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
