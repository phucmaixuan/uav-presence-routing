package main

import (
	"fmt"

	"github.com/paulmach/orb"
)

func main() {
	// Tạo thử một điểm 2D bằng thư viện orb
	pt := orb.Point{106.6297, 10.8231} // Kinh độ, Vĩ độ (TP.HCM)
	fmt.Printf("Đã khởi tạo thành công điểm tại: %v\n", pt)
}
