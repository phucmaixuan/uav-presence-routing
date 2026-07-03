// Khởi tạo các biến trạng thái và lấy tham chiếu DOM
const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

const envSelect = document.getElementById('env-select');
const radiusSlider = document.getElementById('radius-slider');
const radiusVal = document.getElementById('radius-val');

const metricCov = document.getElementById('metric-coverage');
const barCov = document.getElementById('bar-coverage');
const metricOver = document.getElementById('metric-over');
const barOver = document.getElementById('bar-over');

const debugToggle = document.getElementById('debug-bb-toggle');
const legendDebug = document.getElementById('legend-debug');

const decisionPanel = document.getElementById('decision-panel');
const decisionResult = document.getElementById('decision-result');
const decisionReason = document.getElementById('decision-reason');

// State variables
let width = 0;
let height = 0;
let scale = 1; // pixels per meter

// Simulation parameters
const RURAL_CELL_R = 1000; // meters
const URBAN_CELL_R = 200;  // meters
const THRESHOLD_COV = 0.85;
const THRESHOLD_OVER = 3.0;

let state = {
    env: 'urban',
    cellR: URBAN_CELL_R,
    reqX: 0,
    reqY: 0,
    reqRadius: 500,
    cells: [],
    selectedCells: [],
    bbMatchedCells: [],
    metrics: { cov: 0, over: 0 },
    isDragging: false,
    pointer: { x: 0, y: 0 },
    showBB: false
};

function resize() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    width = rect.width;
    height = rect.height;

    scale = state.env === 'urban' ? Math.min(width, height) / 2000 : Math.min(width, height) / 6000;

    generateGrid();
    computeMetrics();
    draw();
}

window.addEventListener('resize', resize);

function generateGrid() {
    state.cells = [];
    const rPx = state.cellR * scale;
    const w = rPx * Math.sqrt(3);
    const h = rPx * 1.5;
    
    const cols = Math.ceil(width / w) + 2;
    const rows = Math.ceil(height / h) + 2;
    
    const cx = width / 2;
    const cy = height / 2;

    for (let q = -Math.floor(cols / 2); q <= Math.floor(cols / 2); q++) {
        for (let r = -Math.floor(rows / 2); r <= Math.floor(rows / 2); r++) {
            const x = cx + w * (q + r / 2.0);
            const y = cy + h * r;
            
            state.cells.push({
                xM: (x - cx) / scale,
                yM: (y - cy) / scale
            });
        }
    }
}

function getHexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push({
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle)
        });
    }
    return pts;
}

function computeMetrics() {
    state.selectedCells = [];
    state.bbMatchedCells = [];
    let totalCellAreaM2 = 0;
    const hexAreaM2 = 2.598076 * state.cellR * state.cellR;
    const reqAreaM2 = Math.PI * state.reqRadius * state.reqRadius;

    const reqMinX = state.reqX - state.reqRadius;
    const reqMaxX = state.reqX + state.reqRadius;
    const reqMinY = state.reqY - state.reqRadius;
    const reqMaxY = state.reqY + state.reqRadius;
    
    const hexHalfWidth = (Math.sqrt(3) / 2) * state.cellR;
    const hexHalfHeight = state.cellR;

    state.cells.forEach(cell => {
        const cellMinX = cell.xM - hexHalfWidth;
        const cellMaxX = cell.xM + hexHalfWidth;
        const cellMinY = cell.yM - hexHalfHeight;
        const cellMaxY = cell.yM + hexHalfHeight;
        
        if (cellMinX <= reqMaxX && cellMaxX >= reqMinX &&
            cellMinY <= reqMaxY && cellMaxY >= reqMinY) {
            state.bbMatchedCells.push(cell);
        }
    });

    state.bbMatchedCells.forEach(cell => {
        let isTrueOverlap = false;
        const dist = Math.hypot(cell.xM - state.reqX, cell.yM - state.reqY);
        
        if (dist <= state.reqRadius) {
            isTrueOverlap = true;
        } else {
            for (let i = 0; i < 100; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * state.cellR;
                const px = cell.xM + r * Math.cos(angle);
                const py = cell.yM + r * Math.sin(angle);
                
                if (Math.hypot(px - state.reqX, py - state.reqY) <= state.reqRadius) {
                    isTrueOverlap = true;
                    break;
                }
            }
        }

        if (isTrueOverlap) {
            state.selectedCells.push(cell);
            totalCellAreaM2 += hexAreaM2;
        }
    });

    let hits = 0;
    const samples = 1000;
    
    for (let i = 0; i < samples; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * state.reqRadius;
        const px = state.reqX + r * Math.cos(angle);
        const py = state.reqY + r * Math.sin(angle);
        
        let covered = false;
        for (let cell of state.selectedCells) {
            if (Math.hypot(px - cell.xM, py - cell.yM) <= state.cellR) {
                covered = true;
                break;
            }
        }
        if (covered) hits++;
    }

    const cov = hits / samples;
    const intersecAreaM2 = cov * reqAreaM2;
    const over = reqAreaM2 > 0 ? (totalCellAreaM2 - intersecAreaM2) / reqAreaM2 : 0;

    state.metrics.cov = cov;
    state.metrics.over = over;

    updateUI();
}

function updateUI() {
    const c = state.metrics.cov;
    const o = state.metrics.over;

    metricCov.textContent = (c * 100).toFixed(1) + '%';
    barCov.style.width = Math.min(c * 100, 100) + '%';
    barCov.className = c >= THRESHOLD_COV ? 'bg-green-500 h-1.5 rounded-full' : 'bg-red-500 h-1.5 rounded-full';

    metricOver.textContent = (o * 100).toFixed(1) + '%';
    barOver.style.width = Math.min(o / 3 * 100, 100) + '%';
    barOver.className = o <= THRESHOLD_OVER ? 'bg-green-500 h-1.5 rounded-full' : 'bg-red-500 h-1.5 rounded-full';

    decisionPanel.className = 'p-4 rounded-lg border-2 flex flex-col items-center justify-center text-center transition-colors duration-300 ';
    
    if (state.selectedCells.length === 0 || c < 0.1) {
        decisionPanel.className += 'bg-gray-100 border-gray-400';
        decisionResult.textContent = 'NOT_SERVABLE';
        decisionResult.className = 'text-xl font-bold text-gray-700 my-2';
        decisionReason.textContent = 'Vùng yêu cầu nằm ngoài vùng phủ sóng của mạng.';
    } else if (c >= THRESHOLD_COV && o <= THRESHOLD_OVER) {
        decisionPanel.className += 'bg-green-50 border-green-500';
        decisionResult.textContent = 'TARGET_AMF';
        decisionResult.className = 'text-xl font-bold text-green-700 my-2';
        decisionReason.textContent = 'Diện tích xấp xỉ tốt bằng Cell ID. Tiết kiệm tài nguyên.';
    } else {
        decisionPanel.className += 'bg-orange-50 border-orange-500';
        decisionResult.textContent = 'TARGET_GMLC';
        decisionResult.className = 'text-xl font-bold text-orange-700 my-2';
        
        if (c < THRESHOLD_COV) {
            decisionReason.textContent = 'Độ phủ quá thấp (<85%). Cần định vị tọa độ chính xác.';
        } else {
            decisionReason.textContent = 'Tràn viền quá mức (>300%). Sẽ gây báo động giả. Cần GMLC.';
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    const cx = width / 2;
    const cy = height / 2;
    
    const reqPxX = cx + state.reqX * scale;
    const reqPxY = cy + state.reqY * scale;
    const reqPxR = state.reqRadius * scale;
    const cellPxR = state.cellR * scale;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    state.cells.forEach(cell => {
        const isSelected = state.selectedCells.includes(cell);
        if (!isSelected) {
            const px = cx + cell.xM * scale;
            const py = cy + cell.yM * scale;
            const pts = getHexPoints(px, py, cellPxR);
            
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            pts.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.stroke();
        }
    });

    state.selectedCells.forEach(cell => {
        const px = cx + cell.xM * scale;
        const py = cy + cell.yM * scale;
        const pts = getHexPoints(px, py, cellPxR);
        
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    if (state.selectedCells.length > 0) {
        ctx.save();
        
        ctx.beginPath();
        state.selectedCells.forEach(cell => {
            const px = cx + cell.xM * scale;
            const py = cy + cell.yM * scale;
            const pts = getHexPoints(px, py, cellPxR);
            ctx.moveTo(pts[0].x, pts[0].y);
            pts.forEach(p => ctx.lineTo(p.x, p.y));
        });
        ctx.clip();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(reqPxX, reqPxY, reqPxR, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        ctx.restore();
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(reqPxX, reqPxY, reqPxR, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.beginPath();
        state.selectedCells.forEach(cell => {
            const px = cx + cell.xM * scale;
            const py = cy + cell.yM * scale;
            const pts = getHexPoints(px, py, cellPxR);
            ctx.moveTo(pts[0].x, pts[0].y);
            pts.forEach(p => ctx.lineTo(p.x, p.y));
        });
        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.fill();
        
        ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(reqPxX, reqPxY, reqPxR, 0, Math.PI * 2);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.arc(reqPxX, reqPxY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2563eb';
    ctx.fill();

    ctx.fillStyle = '#1e40af';
    ctx.font = '600 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Vùng Giám sát (USS)', reqPxX, reqPxY - reqPxR - 10);
    
    if (!state.isDragging) {
         ctx.fillStyle = '#64748b';
         ctx.font = '400 10px Inter';
         ctx.fillText('Kéo để di chuyển', reqPxX, reqPxY + reqPxR + 15);
    }

    if (state.showBB) {
        const hexHalfW = (Math.sqrt(3) / 2) * cellPxR;
        const hexHalfH = cellPxR;

        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.strokeStyle = '#2563eb';
        ctx.strokeRect(reqPxX - reqPxR, reqPxY - reqPxR, reqPxR * 2, reqPxR * 2);

        state.bbMatchedCells.forEach(cell => {
            const px = cx + cell.xM * scale;
            const py = cy + cell.yM * scale;
            const isSelected = state.selectedCells.includes(cell);
            
            if (!isSelected) {
                const pts = getHexPoints(px, py, cellPxR);
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                pts.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.closePath();
                ctx.fillStyle = 'rgba(253, 224, 71, 0.5)';
                ctx.fill();
                
                ctx.strokeStyle = '#ef4444';
            } else {
                ctx.strokeStyle = '#22c55e';
            }
            
            ctx.strokeRect(px - hexHalfW, py - hexHalfH, hexHalfW * 2, hexHalfH * 2);
        });
        ctx.setLineDash([]);
    }
}

envSelect.addEventListener('change', (e) => {
    state.env = e.target.value;
    state.cellR = state.env === 'urban' ? URBAN_CELL_R : RURAL_CELL_R;
    if (state.env === 'rural' && state.reqRadius < 1000) {
        state.reqRadius = 1500;
        radiusSlider.value = 1500;
        radiusVal.textContent = '1500m';
    } else if (state.env === 'urban' && state.reqRadius > 1000) {
        state.reqRadius = 500;
        radiusSlider.value = 500;
        radiusVal.textContent = '500m';
    }
    resize();
});

radiusSlider.addEventListener('input', (e) => {
    state.reqRadius = parseInt(e.target.value);
    radiusVal.textContent = state.reqRadius + 'm';
    computeMetrics();
    draw();
});

debugToggle.addEventListener('change', (e) => {
    state.showBB = e.target.checked;
    legendDebug.style.display = state.showBB ? 'block' : 'none';
    draw();
});

function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function handlePointerDown(e) {
    const p = getPointerPos(e);
    const cx = width / 2;
    const cy = height / 2;
    const reqPxX = cx + state.reqX * scale;
    const reqPxY = cy + state.reqY * scale;
    const reqPxR = state.reqRadius * scale;

    if (Math.hypot(p.x - reqPxX, p.y - reqPxY) < reqPxR + 20) {
        state.isDragging = true;
        state.pointer = p;
        e.preventDefault();
    }
}

function handlePointerMove(e) {
    if (!state.isDragging) return;
    
    const p = getPointerPos(e);
    const dx = p.x - state.pointer.x;
    const dy = p.y - state.pointer.y;
    
    state.reqX += dx / scale;
    state.reqY += dy / scale;
    
    state.pointer = p;
    
    computeMetrics();
    requestAnimationFrame(draw);
    e.preventDefault();
}

function handlePointerUp() {
    if (state.isDragging) {
        state.isDragging = false;
        requestAnimationFrame(draw);
    }
}

canvas.addEventListener('mousedown', handlePointerDown);
window.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);

canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
window.addEventListener('touchmove', handlePointerMove, { passive: false });
window.addEventListener('touchend', handlePointerUp);

// Khởi chạy
setTimeout(() => {
    resize();
}, 100);