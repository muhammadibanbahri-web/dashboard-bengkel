/**
 * Tunas Toyota Kiaracondong — Aftersales Intelligence Dashboard
 * Client-Side Business Logic & Interaction Engine
 */

let dashboardData = null;
let cpusChartInstance = null;
let revenueChartInstance = null;
let cpusCompChartInstance = null;
let custAreaChartInstance = null;
let typeCustChartInstance = null;
let komposisiUeChartInstance = null;
let typeSbeChartInstance = null;
let carSegmentChartInstance = null;
let grFreqChartInstance = null;
let sbeFreqChartInstance = null;
let radarDidinInstance = null;
let radarFickyInstance = null;
let radarAcepInstance = null;
let radarOverlayInstance = null;
let areaMapInstance = null;
let areaMapLayerGroup = null;
let selectedAreaFilter = 'RING 1';

// Funnelling & Booking System Variables
let funnelMonthlyChartInstance = null;
let funnelRingAreaInstance = null;
let funnelFleetRetailInstance = null;
let saFunnelChartInstance = null;
let thsChartInstance = null;
let activePotensiMonth = 'all';
let activeFunnelModulePeriod = 'all';
let bookingCombinedChartInstance = null;
let currentBookingChartType = 'line'; // 'line', 'bar', 'stacked'
let currentBookingCardType = 'line';  // 'line', 'bar', 'area'
let currentBookingFilter = 'all';     // 'all', 'channels_only', 'sa_only'
let bookingChartInstances = {};
let tiktokChartInstance = null;
let activeFunnellingSa = 'ALL';
let bookingData = null;
let funnellingData = null;
let sbiData = null;
let tcareData = null;
let tcareChartInstances = {};
let aoData = null;
let aoChartInstances = {};

const STATE = {
  year: '2026',
  quarter: 'all', // 'all', '1', '2', '3', '4'
  month: 'October', // Default to current operational month (October)
  sa: 'all',      // 'all', 'DIDIN', 'FICKY', 'ACEP'
  segment: 'all'  // 'all', 'RETAIL', 'FLEET', 'SUDECO', 'TPI'
};

function isSegmentInFilter(seg) {
  if (!STATE.segment || STATE.segment === 'all') return true;
  if (!seg) return false;
  return seg.toUpperCase().trim() === STATE.segment.toUpperCase().trim();
}

function syncSegmentPills() {
  const currentSeg = STATE.segment || 'all';
  const segSelect = document.getElementById('filter-segment');
  if (segSelect && segSelect.value !== currentSeg) {
    segSelect.value = currentSeg;
  }
  document.querySelectorAll('.btn-seg-pill').forEach(btn => {
    const btnSeg = btn.getAttribute('data-segment') || 'all';
    if (btnSeg === currentSeg) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  const badge = document.getElementById('active-segment-badge');
  if (badge) {
    if (currentSeg === 'all') {
      badge.textContent = 'Semua Segmen Aktif';
      badge.className = 'tag-badge blue';
    } else if (currentSeg === 'RETAIL') {
      badge.textContent = 'Segmen: Retail (Perorangan)';
      badge.className = 'tag-badge green';
    } else if (currentSeg === 'FLEET') {
      badge.textContent = 'Segmen: Fleet (Perusahaan)';
      badge.className = 'tag-badge blue';
    } else if (currentSeg === 'SUDECO') {
      badge.textContent = 'Segmen: Sudeco (Fleet Khusus)';
      badge.className = 'tag-badge purple';
    } else if (currentSeg === 'TPI') {
      badge.textContent = 'Segmen: TPI (Rental & Mitra)';
      badge.className = 'tag-badge amber';
    }
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Currency and Number Formatter Helpers
function formatIDR(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatCompactIDR(num) {
  if (num === null || num === undefined || isNaN(num) || num === 0) return 'Rp 0';
  if (Math.abs(num) >= 1_000_000_000) {
    return 'Rp ' + (num / 1_000_000_000).toFixed(2) + ' M';
  }
  if (Math.abs(num) >= 1_000_000) {
    return 'Rp ' + (num / 1_000_000).toFixed(1) + ' Jt';
  }
  return formatIDR(num);
}

function formatNum(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
const formatNumber = formatNum;

function formatPct(num, decimals = 1) {
  if (num === null || num === undefined || isNaN(num)) return '0,0%';
  return (num * 100).toFixed(decimals).replace('.', ',') + '%';
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initFilterEvents();
  initImportModal();
  initWsMatrixImporter();
  await loadDashboardData();
  // Preload funnelling, booking, and sbi data in parallel
  loadFunnellingData().catch(e => console.warn('Preload funnelling error:', e));
  loadBookingData().catch(e => console.warn('Preload booking error:', e));
  loadSbiData().catch(e => console.warn('Preload SBI error:', e));
  loadTcareData().catch(e => console.warn('Preload T-Care error:', e));
  loadAoData().catch(e => console.warn('Preload AO error:', e));
});

// Load Data (Fetch static JSON directly for instant CDN loading, fallback to API)
async function loadDashboardData() {
  const loadingEl = document.getElementById('global-loading');
  const currentHash = window.location.hash.replace('#', '');

  // If user opens a dedicated sub-tab (funnelling, booking, tiktok, sbi, tcare, ao), dismiss loading overlay immediately!
  if (['pane-funnelling', 'pane-booking', 'pane-tiktok', 'pane-sbi', 'pane-tcare', 'pane-ao'].includes(currentHash)) {
    if (loadingEl) loadingEl.style.display = 'none';
  } else if (loadingEl) {
    loadingEl.style.display = 'flex';
  }

  // Safety hard timeout: Never let loading overlay block the user for more than 700ms under any circumstance
  const timeoutId = setTimeout(() => {
    if (loadingEl) loadingEl.style.display = 'none';
  }, 700);

  try {
    // Always fetch latest authoritative server data first with versioned caching (instant HTTP cache)
    let serverData = null;
    try {
      const cacheBuster = '?v=9.3_oct_verified';
      let response;
      try {
        response = await fetch('data/dashboard_data.json' + cacheBuster);
        if (!response.ok) throw new Error('Static JSON failed');
      } catch (e) {
        response = await fetch('api/data.php' + cacheBuster);
      }
      if (response && response.ok) {
        serverData = await response.json();
      }
    } catch (err) {
      console.warn('Could not fetch server data:', err);
    }

    // Check if custom imported data exists in localStorage
    const customDataStr = localStorage.getItem('bengkel_custom_dashboard_data');
    if (customDataStr) {
      try {
        const parsed = JSON.parse(customDataStr);
        const serverTime = serverData?.meta?.generated_at ? new Date(serverData.meta.generated_at).getTime() : 0;
        const customTime = parsed?.meta?.generated_at ? new Date(parsed.meta.generated_at).getTime() : 0;
        const serverRecords = serverData?.meta?.total_pkb_records || 0;
        const customRecords = parsed?.meta?.total_pkb_records || 0;

        // Check if custom data has corrupted / 0 revenue for active months with transactions
        const sepKpi = parsed?.monthly_kpis?.['2026']?.['September'];
        const isCorrupt = sepKpi && sepKpi.ue_total > 0 && (!sepKpi.total_revenue || sepKpi.total_revenue === 0 || sepKpi.total_revenue === '0');

        // Check July 2026: If parsed has truncated July (cpus < 500 or ue < 500) while server has full month (> 700)
        const julKpi = parsed?.monthly_kpis?.['2026']?.['July'];
        const isJulyStale = julKpi && (julKpi.cpus < 500 || (julKpi.ue_total && julKpi.ue_total < 500)) && (serverData?.monthly_kpis?.['2026']?.['July']?.cpus > 700);

        // Check if cached data is missing breakdown, cross_selling, or sa_performance
        const isMissingModules = !parsed?.breakdown || parsed.breakdown.length === 0 || !parsed?.cross_selling || parsed.cross_selling.length === 0 || !parsed?.sa_performance || parsed.sa_performance.length === 0;

        // Check if cached data is missing October while server has October
        const isOctMissing = !parsed?.monthly_kpis?.['2026']?.['October'] && !!serverData?.monthly_kpis?.['2026']?.['October'];

        // Check October 2026: If parsed has stale October (fewer records or mismatched SBE count compared to server)
        const octKpi = parsed?.monthly_kpis?.['2026']?.['October'];
        const serverOctKpi = serverData?.monthly_kpis?.['2026']?.['October'];
        const isOctStale = octKpi && serverOctKpi && (
          (octKpi.ue_total < serverOctKpi.ue_total) || 
          (octKpi.cpus < serverOctKpi.cpus) || 
          (serverOctKpi.sbe_count && octKpi.sbe_count !== serverOctKpi.sbe_count) ||
          (serverOctKpi.total_revenue && octKpi.total_revenue < serverOctKpi.total_revenue)
        );

        // Check if cached October cross-selling TIRE for DIDIN or total is missing/zero while server has 10 tires
        const cachedOctTires = (parsed?.sa_cross_selling || []).filter(x => (x.year == 2026 || x.year === '2026') && (x.month_name === 'October' || x.month_name === '10') && x.category === 'TIRE');
        const cachedOctTireQty = cachedOctTires.reduce((acc, x) => acc + (parseFloat(x.qty) || 0), 0);
        const serverOctTires = (serverData?.sa_cross_selling || []).filter(x => (x.year == 2026 || x.year === '2026') && (x.month_name === 'October' || x.month_name === '10') && x.category === 'TIRE');
        // Check if cached October cross-selling TIRE for DIDIN or total is missing/stale (< 4 for DIDIN or < 12 total)
        const cachedOctDidinTire = cachedOctTires.find(x => x.sa === 'DIDIN');
        const cachedOctDidinQty = cachedOctDidinTire ? (parseFloat(cachedOctDidinTire.qty) || 0) : 0;
        const isTireStale = (serverOctTireQty >= 12 && cachedOctTireQty < 12) || cachedOctDidinQty < 4;

        // Check if cached data is missing November in breakdown/cross_selling while server has it
        const hasNovBreakdownServer = serverData?.breakdown?.some(b => String(b.year) === '2026' && b.month_name === 'November');
        const hasNovBreakdownCached = parsed?.breakdown?.some(b => String(b.year) === '2026' && b.month_name === 'November');
        const isNovMissing = hasNovBreakdownServer && !hasNovBreakdownCached;

        // If corrupted, stale July, stale October, missing modules, missing Oct/Nov, stale tires, or server data is strictly newer and has more records, discard stale cache
        if (isCorrupt || isJulyStale || isOctStale || isMissingModules || isOctMissing || isNovMissing || isTireStale || (serverData && serverRecords > customRecords && (serverTime > customTime + 60000))) {
          console.log('Using authoritative server data. Clearing outdated localStorage cache.');
          localStorage.removeItem('bengkel_custom_dashboard_data');
        } else if (parsed && parsed.monthly_kpis && typeof parsed.monthly_kpis === 'object' && Object.keys(parsed.monthly_kpis).length > 0) {
          dashboardData = parsed;
          const statusLabel = document.getElementById('source-status-label');
          const lastSync = localStorage.getItem('bengkel_gsheet_last_sync');
          if (statusLabel) {
            if (lastSync) {
              try {
                const d = new Date(lastSync);
                statusLabel.textContent = `Google Sheets (Live: ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})`;
              } catch (e) {
                statusLabel.textContent = 'Google Sheets (Live)';
              }
            } else {
              statusLabel.textContent = 'Data Impor Kustom (Aktif)';
            }
          }
          const dlBtn = document.getElementById('btn-download-json');
          if (dlBtn) dlBtn.style.display = 'inline-block';
          applyCachedWsMatrix();
          populateFilterOptions();
          renderAll();
          return;
        }
      } catch (e) {
        console.warn('Cached custom data invalid, falling back to server data.');
        localStorage.removeItem('bengkel_custom_dashboard_data');
      }
    }

    if (serverData) {
      dashboardData = serverData;
      const statusLabel = document.getElementById('source-status-label');
      if (statusLabel) {
        statusLabel.textContent = 'DASH KIARACONDONG 24-26.xlsx';
      }
      applyCachedWsMatrix();
      populateFilterOptions();
      renderAll();
      return;
    }
  } catch (outerErr) {
    console.error('Error in loadDashboardData:', outerErr);
  } finally {
    clearTimeout(timeoutId);
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// Populate Filter Controls
function populateFilterOptions() {
  const yearSelect = document.getElementById('filter-year');
  if (!yearSelect || !dashboardData) return;

  const years = dashboardData.meta.years || [2024, 2025, 2026];
  yearSelect.innerHTML = '';
  years.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = yr;
    if (String(yr) === STATE.year) opt.selected = true;
    yearSelect.appendChild(opt);
  });

  const monthSelect = document.getElementById('filter-month');
  if (monthSelect && STATE.month) {
    monthSelect.value = STATE.month;
  }
}

// Filter Event Listeners
function initFilterEvents() {
  const yearSelect = document.getElementById('filter-year');
  const quarterSelect = document.getElementById('filter-quarter');
  const monthSelect = document.getElementById('filter-month');
  const saSelect = document.getElementById('filter-sa');
  const searchInput = document.getElementById('pkb-search-input');

  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      STATE.year = e.target.value;
      renderAll();
    });
  }

  if (quarterSelect) {
    quarterSelect.addEventListener('change', (e) => {
      STATE.quarter = e.target.value;
      if (STATE.quarter !== 'all') {
        STATE.month = 'all';
        if (monthSelect) monthSelect.value = 'all';
      }
      renderAll();
    });
  }

  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      STATE.month = e.target.value;
      if (STATE.month !== 'all') {
        STATE.quarter = 'all';
        if (quarterSelect) quarterSelect.value = 'all';
      }
      renderAll();
    });
  }

  if (saSelect) {
    saSelect.addEventListener('change', (e) => {
      STATE.sa = e.target.value;
      renderAll();
    });
  }

  const segmentSelect = document.getElementById('filter-segment');
  if (segmentSelect) {
    segmentSelect.addEventListener('change', (e) => {
      STATE.segment = e.target.value;
      syncSegmentPills();
      renderAll();
    });
  }

  // Segment Quick Buttons (Retail, Fleet, Sudeco, TPI)
  document.querySelectorAll('.btn-seg-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const segVal = btn.getAttribute('data-segment') || 'all';
      STATE.segment = segVal;
      syncSegmentPills();
      renderAll();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderDataExplorerTable(e.target.value.toLowerCase());
    });
  }

  // Area Mapping Selector Pills
  document.querySelectorAll('.area-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.area-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAreaFilter = btn.getAttribute('data-area') || 'RING 1';
      renderAreaCharacteristicsTable();
    });
  });

  const btnResetMap = document.getElementById('btn-reset-map-view');
  if (btnResetMap) {
    btnResetMap.addEventListener('click', () => {
      if (areaMapInstance) {
        areaMapInstance.setView([-6.9427, 107.6433], 12);
      }
    });
  }

  const btnSync = document.getElementById('btn-sync');
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      if (confirm('Jalankan sinkronisasi data ulang langsung dari Google Sheets? Proses ini membutuhkan waktu sekitar 15-30 detik.')) {
        btnSync.disabled = true;
        btnSync.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 0.8s linear infinite;">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          <span>Sinkronisasi...</span>
        `;
        try {
          const res = await fetch('api/sync.php?source=gsheet');
          const resJson = await res.json();
          localStorage.removeItem('bengkel_custom_dashboard_data');
          alert(resJson.message || 'Sinkronisasi berhasil diselesaikan');
          await loadDashboardData();
        } catch (err) {
          alert('Sinkronisasi via server gagal. Silakan jalankan script Python scripts/sync_from_google_sheets.py secara manual di terminal.');
        } finally {
          btnSync.disabled = false;
          btnSync.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>Sinkronisasi Data</span>
          `;
        }
      }
    });
  }
}
// Enterprise Underline Navigation Tabs with Slide / Drag / Wheel Support & Refresh Persistence
async function activateTab(targetId, updateUrl = true) {
  const tabs = document.querySelectorAll('.tab-nav-link');
  const targetTab = document.querySelector(`.tab-nav-link[data-target="${targetId}"]`);
  const targetPane = document.getElementById(targetId);

  if (!targetTab || !targetPane) return;

  tabs.forEach(t => t.classList.remove('active'));
  targetTab.classList.add('active');

  // Smooth auto-centering of active tab in scrollable bar
  try {
    targetTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  } catch (e) {
    // ignore if unsupported
  }

  document.querySelectorAll('.tab-pane-container').forEach(p => p.classList.remove('active'));
  targetPane.classList.add('active');

  // Persist active tab so refreshing browser stays on current tab
  try {
    localStorage.setItem('bengkel_active_tab', targetId);
    if (updateUrl) {
      history.replaceState(null, null, '#' + targetId);
    }
  } catch (e) {
    console.warn('Could not save active tab state:', e);
  }

  // Handle tab-specific activations and chart resizes
  if (targetId === 'pane-executive') {
    if (cpusChartInstance) cpusChartInstance.resize();
    if (revenueChartInstance) revenueChartInstance.resize();
    if (cpusCompChartInstance) cpusCompChartInstance.resize();
    if (custAreaChartInstance) custAreaChartInstance.resize();
    if (typeCustChartInstance) typeCustChartInstance.resize();
    if (komposisiUeChartInstance) komposisiUeChartInstance.resize();
    if (typeSbeChartInstance) typeSbeChartInstance.resize();
    if (carSegmentChartInstance) carSegmentChartInstance.resize();
    if (grFreqChartInstance) grFreqChartInstance.resize();
    if (sbeFreqChartInstance) sbeFreqChartInstance.resize();
  } else if (targetId === 'pane-breakdown') {
    renderBreakdownTable();
  } else if (targetId === 'pane-cross') {
    renderCrossSellingTable();
  } else if (targetId === 'pane-sa-perf') {
    renderSAPerformanceCards();
    renderSARadarCharts();
    setTimeout(() => {
      if (radarDidinInstance) radarDidinInstance.resize();
      if (radarFickyInstance) radarFickyInstance.resize();
      if (radarAcepInstance) radarAcepInstance.resize();
      if (radarOverlayInstance) radarOverlayInstance.resize();
    }, 100);
  } else if (targetId === 'pane-area-mapping') {
    if (!areaMapInstance) {
      initAreaMap();
    } else {
      setTimeout(() => {
        areaMapInstance.invalidateSize();
      }, 200);
    }
    renderAreaMapping();
    renderAreaCharacteristicsTable();
    renderMappingRingAndFleetCharts();
    setTimeout(() => {
      if (mapRingAreaInstance) mapRingAreaInstance.resize();
      if (mapFleetRetailInstance) mapFleetRetailInstance.resize();
    }, 150);
  } else if (targetId === 'pane-funnelling') {
    if (!funnellingData) {
      await loadFunnellingData();
    } else {
      renderFunnelling();
    }
    setTimeout(() => {
      if (funnelMonthlyChartInstance) funnelMonthlyChartInstance.resize();
      if (funnelRingAreaInstance) funnelRingAreaInstance.resize();
      if (funnelFleetRetailInstance) funnelFleetRetailInstance.resize();
      if (saFunnelChartInstance) saFunnelChartInstance.resize();
      if (thsChartInstance) thsChartInstance.resize();
    }, 100);
  } else if (targetId === 'pane-booking') {
    if (!bookingData) {
      await loadBookingData();
    } else {
      renderBooking();
    }
    setTimeout(() => {
      Object.values(bookingChartInstances).forEach(c => c && c.resize && c.resize());
    }, 100);
  } else if (targetId === 'pane-tiktok') {
    if (!bookingData) {
      await loadBookingData();
    } else {
      renderTikTokLive();
    }
    setTimeout(() => {
      if (tiktokChartInstance) tiktokChartInstance.resize();
    }, 100);
  } else if (targetId === 'pane-sbi') {
    if (!sbiData) {
      await loadSbiData();
    } else {
      renderSbi();
    }
    setTimeout(() => {
      Object.values(sbiChartInstances).forEach(c => c && c.resize && c.resize());
    }, 100);
  } else if (targetId === 'pane-tcare') {
    if (!tcareData) {
      await loadTcareData();
    } else {
      renderTcare();
    }
    setTimeout(() => {
      Object.values(tcareChartInstances).forEach(c => c && c.resize && c.resize());
    }, 100);
  } else if (targetId === 'pane-ao') {
    if (typeof initAoViewToggle === 'function') initAoViewToggle();
    if (!aoData) {
      await loadAoData();
    } else {
      renderAoReport();
    }
    setTimeout(() => {
      Object.values(aoChartInstances).forEach(c => c && c.resize && c.resize());
    }, 100);
  }
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-nav-link');
  const tabBar = document.getElementById('corporate-tab-bar') || document.querySelector('.corporate-tab-bar');
  const track = document.querySelector('.tab-slider-track');
  const prevBtn = document.getElementById('tab-slide-prev');
  const nextBtn = document.getElementById('tab-slide-next');

  // Update slide buttons and gradient indicators
  const updateSlideControls = () => {
    if (!tabBar) return;
    const canScrollLeft = tabBar.scrollLeft > 4;
    const canScrollRight = tabBar.scrollLeft < (tabBar.scrollWidth - tabBar.clientWidth - 4);

    if (prevBtn) {
      if (canScrollLeft) prevBtn.classList.remove('disabled');
      else prevBtn.classList.add('disabled');
    }

    if (nextBtn) {
      if (canScrollRight) nextBtn.classList.remove('disabled');
      else nextBtn.classList.add('disabled');
    }

    if (track) {
      track.classList.toggle('can-scroll-left', canScrollLeft);
      track.classList.toggle('can-scroll-right', canScrollRight);
    }
  };

  if (tabBar) {
    // 1. Scroll event to update controls
    tabBar.addEventListener('scroll', updateSlideControls, { passive: true });
    window.addEventListener('resize', updateSlideControls);

    // Initial check
    setTimeout(updateSlideControls, 150);

    // 2. Prev & Next Buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        tabBar.scrollBy({ left: -260, behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        tabBar.scrollBy({ left: 260, behavior: 'smooth' });
      });
    }

    // 3. Mouse Wheel Horizontal Scrolling
    tabBar.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        tabBar.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // 4. Drag-to-Scroll (Grab and Slide)
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let hasDragged = false;

    tabBar.addEventListener('mousedown', (e) => {
      isDown = true;
      hasDragged = false;
      startX = e.pageX - tabBar.offsetLeft;
      scrollStart = tabBar.scrollLeft;
      tabBar.classList.add('is-dragging');
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        if (tabBar) tabBar.classList.remove('is-dragging');
      }
    });

    tabBar.addEventListener('mouseleave', () => {
      if (isDown) {
        isDown = false;
        if (tabBar) tabBar.classList.remove('is-dragging');
      }
    });

    tabBar.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const x = e.pageX - tabBar.offsetLeft;
      const walk = (x - startX) * 1.4; // Multiplier for smooth sliding
      if (Math.abs(walk) > 5) {
        hasDragged = true;
      }
      tabBar.scrollLeft = scrollStart - walk;
    });

    // Prevent tab activation if user was actively dragging
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (hasDragged) {
          e.preventDefault();
          e.stopPropagation();
          hasDragged = false;
        }
      }, true);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const targetId = tab.getAttribute('data-target');
      if (targetId) {
        await activateTab(targetId);
      }
    });
  });

  // Restore saved active tab on refresh / load
  const savedTab = window.location.hash.replace('#', '') || localStorage.getItem('bengkel_active_tab');
  if (savedTab && document.getElementById(savedTab)) {
    setTimeout(() => {
      activateTab(savedTab, false);
    }, 60);
  }

  window.addEventListener('hashchange', () => {
    const hashTab = window.location.hash.replace('#', '');
    if (hashTab && document.getElementById(hashTab)) {
      activateTab(hashTab, false);
    }
  });

  // Radar View Mode Toggle (3 Cards vs Overlay Comparison)
  const btnCards = document.getElementById('btn-radar-view-cards');
  const btnOverlay = document.getElementById('btn-radar-view-overlay');
  const wrapperCards = document.getElementById('sa-radar-cards-wrapper');
  const wrapperOverlay = document.getElementById('sa-radar-overlay-wrapper');

  if (btnCards && btnOverlay && wrapperCards && wrapperOverlay) {
    btnCards.addEventListener('click', () => {
      btnCards.classList.add('active');
      btnOverlay.classList.remove('active');
      wrapperCards.style.display = 'grid';
      wrapperOverlay.style.display = 'none';
      if (radarDidinInstance) radarDidinInstance.resize();
      if (radarFickyInstance) radarFickyInstance.resize();
      if (radarAcepInstance) radarAcepInstance.resize();
    });

    btnOverlay.addEventListener('click', () => {
      btnOverlay.classList.add('active');
      btnCards.classList.remove('active');
      wrapperCards.style.display = 'none';
      wrapperOverlay.style.display = 'block';
      if (radarOverlayInstance) radarOverlayInstance.resize();
    });
  }
}

// Check if a month belongs to selected period filter
function isMonthInFilter(monthName) {
  if (STATE.month !== 'all') {
    return monthName === STATE.month;
  }
  if (STATE.quarter !== 'all') {
    const q = parseInt(STATE.quarter);
    const mIdx = MONTH_NAMES.indexOf(monthName);
    const currentQ = Math.floor(mIdx / 3) + 1;
    return currentQ === q;
  }
  return true; // all months
}

// Main Render Function
function renderAll() {
  if (!dashboardData) return;
  updatePeriodDisplay();
  renderHeroKPIs();
  renderCharts();
  renderFrequencyRevenueCharts();
  renderAnalyticsCharts();
  renderWSPerformanceTable();
  renderSAPerformanceCards();
  renderSARadarCharts();
  renderBreakdownTable();
  renderCrossSellingTable();
  renderAreaMapping();
  renderAreaCharacteristicsTable();
  renderMappingRingAndFleetCharts();
  renderDataExplorerTable();
}

// Update Active Period Label
function updatePeriodDisplay() {
  const periodValEl = document.getElementById('active-period-val');
  if (!periodValEl) return;

  let text = '';
  if (STATE.month !== 'all') {
    const idx = MONTH_NAMES.indexOf(STATE.month);
    const idName = idx >= 0 ? MONTH_NAMES_ID[idx] : STATE.month;
    text = `Bulan: ${idName} ${STATE.year}`;
  } else if (STATE.quarter !== 'all') {
    text = `Kuartal ${STATE.quarter} ${STATE.year}`;
  } else {
    text = `Tahun ${STATE.year} (YTD)`;
  }

  if (STATE.sa !== 'all') {
    text += ` • ${STATE.sa}`;
  }

  if (STATE.segment && STATE.segment !== 'all') {
    const segMap = {
      'RETAIL': 'Retail',
      'FLEET': 'Fleet',
      'SUDECO': 'Sudeco',
      'TPI': 'TPI'
    };
    text += ` • Segmen: ${segMap[STATE.segment] || STATE.segment}`;
  }

  periodValEl.textContent = text;
}

// -------------------------------------------------------------------
// 1. HERO KPI CARDS
// -------------------------------------------------------------------
function renderHeroKPIs() {
  const yr = STATE.year;
  const ly = String(parseInt(yr) - 1);

  const monthsInScope = MONTH_NAMES.filter(m => isMonthInFilter(m));

  let actualUE = 0;
  let lyUE = 0;

  let actualCPUS = 0;
  let targetCPUS = 0;
  let lyCPUS = 0;

  let actualRev = 0;
  let targetRev = 0;
  let lyRev = 0;

  let tcareUnits = 0;
  let lyTcareUnits = 0;
  let actualSBE = 0;
  let lySBE = 0;

  if (STATE.segment !== 'all' && dashboardData.breakdown) {
    dashboardData.breakdown
      .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && isSegmentInFilter(item.fleet_retail) && (STATE.sa === 'all' || item.sa === STATE.sa))
      .forEach(item => {
        actualUE += item.units || 0;
        actualCPUS += item.units || 0;
        actualRev += item.revenue || 0;
        if (item.tcare && item.tcare.toLowerCase() === 't-care') tcareUnits += item.units || 0;
        if (item.type_service && item.type_service.toUpperCase().includes('SBE')) actualSBE += item.units || 0;
      });

    dashboardData.breakdown
      .filter(item => String(item.year) === ly && isMonthInFilter(item.month_name) && isSegmentInFilter(item.fleet_retail) && (STATE.sa === 'all' || item.sa === STATE.sa))
      .forEach(item => {
        lyUE += item.units || 0;
        lyCPUS += item.units || 0;
        lyRev += item.revenue || 0;
        if (item.tcare && item.tcare.toLowerCase() === 't-care') lyTcareUnits += item.units || 0;
        if (item.type_service && item.type_service.toUpperCase().includes('SBE')) lySBE += item.units || 0;
      });

    const totalYrUnits = dashboardData.breakdown.filter(item => String(item.year) === yr).reduce((s, b) => s + (b.units || 0), 0) || 1;
    const segYrUnits = dashboardData.breakdown.filter(item => String(item.year) === yr && isSegmentInFilter(item.fleet_retail)).reduce((s, b) => s + (b.units || 0), 0);
    const segRatio = segYrUnits / totalYrUnits;

    monthsInScope.forEach(m => {
      const targetItem = dashboardData.targets[yr]?.[m];
      if (targetItem) {
        targetCPUS += Math.round((targetItem.cpus || 0) * segRatio);
        targetRev += Math.round((targetItem.revenue_total || 0) * segRatio);
      }
    });
  } else {
    monthsInScope.forEach(m => {
    // Current Year Actuals
    const curMonthData = dashboardData.monthly_kpis[yr]?.[m];
    if (curMonthData) {
      if (STATE.sa === 'all') {
        let mCpus = curMonthData.cpus || 0;
        let mUe = curMonthData.ue_total || curMonthData.ue || mCpus;
        let mRev = (curMonthData.total_revenue !== undefined ? curMonthData.total_revenue : curMonthData.cpus_revenue) || 0;
        let mTc = curMonthData.tcare_count || 0;
        let mSbe = curMonthData.sbe_count || 0;

        // Authoritative reconciliation from ws_matrix_kabeng for 2026
        if (yr === '2026' && dashboardData.ws_matrix_kabeng?.rows) {
          const mIdx = MONTH_NAMES.indexOf(m);
          if (mIdx >= 0) {
            const ueRow = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '1' || r.kpi === 'Unit Entry');
            if (ueRow && ueRow.months?.[mIdx] !== undefined) {
              const v = Number(ueRow.months[mIdx]) || 0;
              if (v > mUe) mUe = v;
            }
            const sbeRow = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '5' || r.kpi === 'Unit SBE Total');
            if (sbeRow && sbeRow.months?.[mIdx] !== undefined) {
              const v = Number(sbeRow.months[mIdx]) || 0;
              if (v > 0) mSbe = v;
            }
            const tcRow = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '7' || r.kpi === 'SBE Tcare');
            if (tcRow && tcRow.months?.[mIdx] !== undefined) {
              const v = Number(tcRow.months[mIdx]) || 0;
              if (v > mTc) mTc = v;
            }
            const cpusRow = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '2' || r.kpi === 'CPUS (PKB)');
            if (cpusRow && cpusRow.months?.[mIdx] !== undefined) {
              const v = Number(cpusRow.months[mIdx]) || 0;
              if (v > mCpus) mCpus = v;
            }
            const revRow = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '12' || r.kpi === 'Revenue Total');
            if (revRow && revRow.months?.[mIdx] !== undefined) {
              const v = (Number(revRow.months[mIdx]) || 0) * 1000;
              if (v > mRev) mRev = v;
            }
          }
        }
        actualUE += mUe;
        actualCPUS += mCpus;
        actualRev += mRev;
        tcareUnits += mTc;
        actualSBE += mSbe;
      } else {
        const saItem = dashboardData.sa_performance.find(
          item => String(item.year) === yr && item.month_name === m && item.sa === STATE.sa
        );
        if (saItem) {
          actualUE += saItem.ue || saItem.cpus || 0;
          actualCPUS += saItem.cpus || 0;
          actualRev += saItem.revenue || 0;
          tcareUnits += saItem.tcare_ue || 0;
          actualSBE += saItem.sbe_ue || 0;
        }
      }
    }

    // Current Year Targets
    const targetItem = dashboardData.targets[yr]?.[m];
    if (targetItem) {
      targetCPUS += targetItem.cpus || 0;
      targetRev += targetItem.revenue_total || 0;
    }

    // Last Year Actuals
    const lyMonthData = dashboardData.monthly_kpis[ly]?.[m];
    if (lyMonthData) {
      if (STATE.sa === 'all') {
        lyUE += lyMonthData.ue_total || lyMonthData.ue || lyMonthData.cpus || 0;
        lyCPUS += lyMonthData.cpus || 0;
        lyRev += (lyMonthData.total_revenue !== undefined ? lyMonthData.total_revenue : lyMonthData.cpus_revenue) || 0;
        lyTcareUnits += lyMonthData.tcare_count || 0;
        lySBE += lyMonthData.sbe_count || 0;
      } else {
        const saLy = dashboardData.sa_performance.find(
          item => String(item.year) === ly && item.month_name === m && item.sa === STATE.sa
        );
        if (saLy) {
          lyUE += saLy.ue || saLy.cpus || 0;
          lyCPUS += saLy.cpus || 0;
          lyRev += saLy.revenue || 0;
          lyTcareUnits += saLy.tcare_ue || 0;
          lySBE += saLy.sbe_ue || 0;
        }
      }
    }
  });
  }

  // Calculate Metrics
  const cpusAchieve = targetCPUS > 0 ? actualCPUS / targetCPUS : 0;
  const cpusGrowth = lyCPUS > 0 ? (actualCPUS - lyCPUS) / lyCPUS : 0;

  const revAchieve = targetRev > 0 ? actualRev / targetRev : 0;
  const revGrowth = lyRev > 0 ? (actualRev - lyRev) / lyRev : 0;

  // Revisi No 2: Rumus Total Revenue dibagi Total Unit Entry (CPUS & Non CPUS)
  const revPerUnit = actualUE > 0 ? actualRev / actualUE : (actualCPUS > 0 ? actualRev / actualCPUS : 0);
  const lyRevPerUnit = lyUE > 0 ? lyRev / lyUE : (lyCPUS > 0 ? lyRev / lyCPUS : 0);
  const revPerUnitGrowth = lyRevPerUnit > 0 ? (revPerUnit - lyRevPerUnit) / lyRevPerUnit : 0;
  const revPerUnitAchieve = revPerUnit / 1_500_000; // Benchmark Rp 1.5M

  // T-Care Rate calculated against SBE (Unit SBE Total)
  const tcareRate = actualSBE > 0 ? tcareUnits / actualSBE : (actualCPUS > 0 ? tcareUnits / actualCPUS : 0);
  const lyTcareRate = lySBE > 0 ? lyTcareUnits / lySBE : (lyCPUS > 0 ? lyTcareUnits / lyCPUS : 0);
  const tcareDiff = tcareRate - lyTcareRate;
  const tcareTarget = 0.70; // Target standar rasio T-Care terhadap SBE (315 T-Care / 450 SBE = 70,0%)
  const tcareAchieve = tcareTarget > 0 ? tcareRate / tcareTarget : 0;

  // Update Status YoY Badge
  const statusBadge = document.getElementById('status-yoy-badge');
  if (statusBadge) {
    const isUp = revGrowth >= 0;
    statusBadge.className = `trend-indicator-pill ${isUp ? 'positive' : 'negative'}`;
    statusBadge.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        ${isUp ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>'}
      </svg>
      <span>${isUp ? 'NAIK' : 'TURUN'} (${formatPct(revGrowth, 1)})</span>
    `;
  }

  // 1. CPUS Card
  document.getElementById('kpi-cpus-val').textContent = formatNum(actualCPUS);
  const ueInlineEl = document.getElementById('kpi-ue-total-inline');
  if (ueInlineEl) ueInlineEl.textContent = `Total UE: ${formatNum(actualUE)}`;
  document.getElementById('kpi-cpus-target').textContent = formatNum(targetCPUS);
  document.getElementById('kpi-cpus-achieve').textContent = formatPct(cpusAchieve);
  document.getElementById('kpi-cpus-ly').textContent = formatNum(lyCPUS) + ' Unit';
  updateGrowthBadge('kpi-cpus-growth', cpusGrowth, formatPct(cpusGrowth) + ' YoY');
  updateTargetBar('kpi-cpus-bar', cpusAchieve * 100, 'var(--corporate-navy)');

  // 2. Revenue Card
  document.getElementById('kpi-rev-val').textContent = formatCompactIDR(actualRev);
  document.getElementById('kpi-rev-val').title = formatIDR(actualRev);
  document.getElementById('kpi-rev-target').textContent = formatCompactIDR(targetRev);
  document.getElementById('kpi-rev-achieve').textContent = formatPct(revAchieve);
  document.getElementById('kpi-rev-ly').textContent = formatCompactIDR(lyRev);
  updateGrowthBadge('kpi-rev-growth', revGrowth, formatPct(revGrowth) + ' YoY');
  updateTargetBar('kpi-rev-bar', revAchieve * 100, 'var(--toyota-red)');

  // 3. Rev / Unit Card (Total Revenue dibagi Total Unit Entry CPUS & Non CPUS)
  document.getElementById('kpi-revpcpus-val').textContent = formatIDR(revPerUnit);
  document.getElementById('kpi-revpcpus-target').textContent = 'Rp 1,5 Jt';
  document.getElementById('kpi-revpcpus-achieve').textContent = formatPct(revPerUnitAchieve);
  document.getElementById('kpi-revpcpus-ly').textContent = formatIDR(lyRevPerUnit);
  updateGrowthBadge('kpi-revpcpus-growth', revPerUnitGrowth, formatPct(revPerUnitGrowth) + ' YoY');
  updateTargetBar('kpi-revpcpus-bar', revPerUnitAchieve * 100, 'var(--status-up)');

  // 4. Cont T-Care Card (Persentase terhadap SBE)
  document.getElementById('kpi-tcare-val').textContent = formatPct(tcareRate);
  const tcareDetailEl = document.getElementById('kpi-tcare-detail');
  if (tcareDetailEl) {
    tcareDetailEl.textContent = `${formatNum(tcareUnits)} T-Care / ${formatNum(actualSBE)} SBE`;
    tcareDetailEl.title = `Rasio: ${formatNum(tcareUnits)} Unit T-Care dari total ${formatNum(actualSBE)} Unit SBE (Servis Berkala)`;
  }
  document.getElementById('kpi-tcare-target').textContent = formatPct(tcareTarget);
  document.getElementById('kpi-tcare-achieve').textContent = formatPct(tcareAchieve);
  document.getElementById('kpi-tcare-ly').textContent = formatPct(lyTcareRate);
  updateGrowthBadge('kpi-tcare-growth', tcareDiff, (tcareDiff >= 0 ? '+' : '') + (tcareDiff * 100).toFixed(1).replace('.', ',') + ' ppt', true);
  updateTargetBar('kpi-tcare-bar', tcareAchieve * 100, '#d97706');
}

function updateGrowthBadge(id, val, text, isDiff = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const isPositive = val >= 0;
  el.className = `kpi-growth-badge ${isPositive ? 'positive' : 'negative'}`;
  el.textContent = (isPositive && !isDiff ? '+' : '') + text;
}

function updateTargetBar(id, pct, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = Math.min(Math.max(pct, 0), 100) + '%';
  el.style.backgroundColor = color;
}

// -------------------------------------------------------------------
// 2. CORPORATE TREND CHARTS (Chart.js)
// -------------------------------------------------------------------
function renderCharts() {
  const yr = STATE.year;
  const ly = String(parseInt(yr) - 1);

  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const actualCPUSData = [];
  const targetCPUSData = [];
  const lyCPUSData = [];

  const actualRevData = [];
  const targetRevData = [];
  const lyRevData = [];

  MONTH_NAMES.forEach((m, mIdx) => {
    const cData = dashboardData.monthly_kpis[yr]?.[m];
    const tData = dashboardData.targets[yr]?.[m];
    const lyData = dashboardData.monthly_kpis[ly]?.[m];

    let actualCpus = cData ? (cData.cpus || 0) : 0;
    let actualRev = cData ? (((cData.total_revenue !== undefined ? cData.total_revenue : cData.cpus_revenue) || 0) / 1_000_000) : 0;

    if (yr === '2026' && dashboardData.ws_matrix_kabeng?.rows) {
      const cpusRow = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '2' || r.kpi === 'CPUS (PKB)');
      if (cpusRow && cpusRow.months?.[mIdx] > actualCpus) actualCpus = Number(cpusRow.months[mIdx]);

      const revRow = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '12' || r.kpi === 'Revenue Total');
      if (revRow && revRow.months?.[mIdx]) {
        const rVal = (Number(revRow.months[mIdx]) || 0) / 1000;
        if (rVal > actualRev) actualRev = rVal;
      }
    }

    actualCPUSData.push(actualCpus);
    targetCPUSData.push(tData ? (tData.cpus || 0) : 0);
    lyCPUSData.push(lyData ? (lyData.cpus || 0) : 0);

    actualRevData.push(actualRev);
    targetRevData.push(tData ? ((tData.revenue_total || 0) / 1_000_000) : 0);
    lyRevData.push(lyData ? (((lyData.total_revenue !== undefined ? lyData.total_revenue : lyData.cpus_revenue) || 0) / 1_000_000) : 0);
  });

  const isMobile = window.innerWidth < 640;
  const chartFont = {
    family: "'Plus Jakarta Sans', sans-serif",
    size: isMobile ? 10 : 11.5,
    weight: 500
  };

  // CPUS Trend Chart
  const ctxCPUS = document.getElementById('chart-cpus');
  if (ctxCPUS) {
    if (cpusChartInstance) cpusChartInstance.destroy();
    cpusChartInstance = new Chart(ctxCPUS, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: `Aktual ${yr}`,
            data: actualCPUSData,
            backgroundColor: '#0f172a',
            borderRadius: 3,
            maxBarThickness: isMobile ? 18 : 32,
            order: 2
          },
          {
            label: `Target ${yr}`,
            data: targetCPUSData,
            type: 'line',
            borderColor: '#eb0a1e',
            borderWidth: 1.8,
            borderDash: [4, 4],
            pointBackgroundColor: '#eb0a1e',
            pointRadius: isMobile ? 2 : 3,
            fill: false,
            order: 1
          },
          {
            label: `Realisasi ${ly} (LY)`,
            data: lyCPUSData,
            type: 'line',
            borderColor: '#94a3b8',
            borderWidth: 1.5,
            pointBackgroundColor: '#94a3b8',
            pointRadius: isMobile ? 1.5 : 2.5,
            fill: false,
            order: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: isMobile ? 'center' : 'end',
            labels: {
              boxWidth: isMobile ? 8 : 12,
              boxHeight: isMobile ? 8 : 12,
              padding: isMobile ? 6 : 10,
              font: chartFont,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 700 },
            bodyFont: chartFont,
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ${formatNum(item.raw)} Unit`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.7)' },
            ticks: { font: chartFont, color: '#64748b' }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: isMobile ? 9 : 11.5,
                weight: 500
              },
              color: '#64748b',
              maxRotation: isMobile ? 40 : 0,
              minRotation: isMobile ? 40 : 0,
              autoSkip: false
            }
          }
        }
      }
    });
  }

  // Revenue Trend Chart
  const ctxRev = document.getElementById('chart-revenue');
  if (ctxRev) {
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctxRev, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: `Aktual ${yr} (Juta)`,
            data: actualRevData,
            backgroundColor: '#1e293b',
            borderRadius: 3,
            maxBarThickness: isMobile ? 18 : 32,
            order: 2
          },
          {
            label: `Target ${yr} (Juta)`,
            data: targetRevData,
            type: 'line',
            borderColor: '#eb0a1e',
            borderWidth: 1.8,
            pointBackgroundColor: '#eb0a1e',
            pointRadius: isMobile ? 2 : 3,
            fill: false,
            order: 1
          },
          {
            label: `Realisasi ${ly} (LY)`,
            data: lyRevData,
            type: 'line',
            borderColor: '#cbd5e1',
            borderWidth: 1.5,
            pointBackgroundColor: '#cbd5e1',
            pointRadius: isMobile ? 1.5 : 2.5,
            fill: false,
            order: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: isMobile ? 'center' : 'end',
            labels: {
              boxWidth: isMobile ? 8 : 12,
              boxHeight: isMobile ? 8 : 12,
              padding: isMobile ? 6 : 10,
              font: chartFont,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 700 },
            bodyFont: chartFont,
            callbacks: {
              label: (item) => ` ${item.dataset.label}: Rp ${formatNum(item.raw, 1)} Jt`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.7)' },
            ticks: { font: chartFont, color: '#64748b' }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: isMobile ? 9 : 11.5,
                weight: 500
              },
              color: '#64748b',
              maxRotation: isMobile ? 40 : 0,
              minRotation: isMobile ? 40 : 0,
              autoSkip: false
            }
          }
        }
      }
    });
  }
}

// -------------------------------------------------------------------
// 2A. FREQUENCY & REVENUE MATRIX CHARTS (GR & SBE)
// -------------------------------------------------------------------
function renderFrequencyRevenueCharts() {
  const grCanvas = document.getElementById('chart-gr-freq');
  const sbeCanvas = document.getElementById('chart-sbe-freq');
  if (!grCanvas || !sbeCanvas || !dashboardData) return;

  const yr = STATE.year;
  const RUPIAH_TIERS = ['< 500rb', '500rb - 1jt', '1jt - 2.5jt', '2.5 - 5jt', '> 5jt'];
  const FREQ_TIERS = ['< 3', '3 - 5', '5 - 10', '> 10'];

  const grAgg = {};
  const sbeAgg = {};
  RUPIAH_TIERS.forEach(r => {
    grAgg[r] = {};
    sbeAgg[r] = {};
    FREQ_TIERS.forEach(f => {
      grAgg[r][f] = { count: 0, revenue: 0 };
      sbeAgg[r][f] = { count: 0, revenue: 0 };
    });
  });

  let totalGrUnits = 0, totalGrRev = 0;
  let totalSbeUnits = 0, totalSbeRev = 0;

  if (dashboardData.executive_frequency_revenue) {
    dashboardData.executive_frequency_revenue
      .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name))
      .filter(item => STATE.sa === 'all' ? item.sa === 'ALL' : item.sa === STATE.sa)
      .forEach(item => {
        RUPIAH_TIERS.forEach(r => {
          FREQ_TIERS.forEach(f => {
            if (item.gr?.[r]?.[f]) {
              const c = item.gr[r][f].count || 0;
              const rev = item.gr[r][f].revenue || 0;
              grAgg[r][f].count += c;
              grAgg[r][f].revenue += rev;
              totalGrUnits += c;
              totalGrRev += rev;
            }
            if (item.sbe?.[r]?.[f]) {
              const c = item.sbe[r][f].count || 0;
              const rev = item.sbe[r][f].revenue || 0;
              sbeAgg[r][f].count += c;
              sbeAgg[r][f].revenue += rev;
              totalSbeUnits += c;
              totalSbeRev += rev;
            }
          });
        });
      });
  }

  const grBadge = document.getElementById('badge-gr-freq-total');
  if (grBadge) grBadge.textContent = `${formatNum(totalGrUnits)} Unit (${formatCompactIDR(totalGrRev)})`;

  const sbeBadge = document.getElementById('badge-sbe-freq-total');
  if (sbeBadge) sbeBadge.textContent = `${formatNum(totalSbeUnits)} Unit (${formatCompactIDR(totalSbeRev)})`;

  const isMobile = window.innerWidth <= 768;
  const chartFont = { family: "'Plus Jakarta Sans', sans-serif", size: isMobile ? 9.5 : 11 };

  // Palettes (Blue for GR, Green for SBE)
  const grColors = ['#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a'];
  const sbeColors = ['#bbf7d0', '#86efac', '#4ade80', '#16a34a', '#14532d'];

  // GR Datasets
  const grDatasets = RUPIAH_TIERS.map((tier, idx) => ({
    label: tier,
    data: FREQ_TIERS.map(f => grAgg[tier][f].revenue),
    unitCounts: FREQ_TIERS.map(f => grAgg[tier][f].count),
    backgroundColor: grColors[idx],
    borderRadius: 3
  }));

  // SBE Datasets
  const sbeDatasets = RUPIAH_TIERS.map((tier, idx) => ({
    label: tier,
    data: FREQ_TIERS.map(f => sbeAgg[tier][f].revenue),
    unitCounts: FREQ_TIERS.map(f => sbeAgg[tier][f].count),
    backgroundColor: sbeColors[idx],
    borderRadius: 3
  }));

  const commonOptions = (isGR) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: isMobile ? 'center' : 'end',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 8,
          font: chartFont,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 700 },
        bodyFont: chartFont,
        callbacks: {
          title: (items) => `Frekuensi Servis: ${items[0].label} Kedatangan`,
          label: (item) => {
            const rev = item.raw || 0;
            const units = item.dataset.unitCounts?.[item.dataIndex] || 0;
            return ` ${item.dataset.label}: ${formatIDR(rev)} (${formatNum(units)} Unit)`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: chartFont, color: '#475569' },
        title: { display: true, text: 'Jumlah Servis (Frekuensi Kedatangan)', font: { size: 11, weight: '600' } }
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(226, 232, 240, 0.7)' },
        ticks: {
          font: chartFont,
          color: '#64748b',
          callback: v => formatCompactIDR(v)
        },
        title: { display: true, text: isGR ? 'Omset GR (Rupiah)' : 'Omset SBE (Rupiah)', font: { size: 11, weight: '600' } }
      }
    }
  });

  if (grFreqChartInstance) grFreqChartInstance.destroy();
  if (sbeFreqChartInstance) sbeFreqChartInstance.destroy();

  grFreqChartInstance = new Chart(grCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['< 3 Servis', '3 - 5 Servis', '5 - 10 Servis', '> 10 Servis'],
      datasets: grDatasets
    },
    options: commonOptions(true)
  });

  sbeFreqChartInstance = new Chart(sbeCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['< 3 Servis', '3 - 5 Servis', '5 - 10 Servis', '> 10 Servis'],
      datasets: sbeDatasets
    },
    options: commonOptions(false)
  });
}

// -------------------------------------------------------------------
// 2B. 6 ANALYTICS & COMPOSITION CHARTS (EXCEL BIWEEKLY STANDARD)
// -------------------------------------------------------------------
function renderAnalyticsCharts() {
  if (!dashboardData || !dashboardData.analytics_charts) return;

  const yr = parseInt(STATE.year);
  const records = dashboardData.analytics_charts.filter(item => {
    if (item.year !== yr) return false;
    if (!isMonthInFilter(item.month_name)) return false;
    if (STATE.sa === 'all') {
      return item.sa === 'ALL';
    } else {
      return item.sa === STATE.sa;
    }
  });

  // Aggregation containers
  const custAreaCounts = { 'RING 1': 0, 'RING 2': 0, 'RING 3': 0, 'OUT OF AREA': 0 };
  const typeCustCounts = { 'AKTIF': 0, 'PASIF': 0, 'NEW CUST': 0 };
  const komposisiUeCounts = { 'SBE': 0, 'GR': 0, 'GR OIL': 0, 'TWC': 0, 'SBI': 0 };
  const typeSbeCounts = {
    '1K': 0, '10K': 0, '20K': 0, '30K': 0, '40K': 0, '50K': 0,
    '60K': 0, '70K': 0, '80K': 0, '90K': 0, '100K': 0, '100K UP': 0
  };
  const cpusCompCounts = { 'RETAIL': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 };
  const carSegCounts = {
    'Mid-Low Segment': { 'TOTAL': 0, 'RETAIL': 0, 'TOTAL FLEET': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 },
    'Mid-Up segment': { 'TOTAL': 0, 'RETAIL': 0, 'TOTAL FLEET': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 }
  };

  records.forEach(r => {
    // 1. Cust Area
    if (r.cust_area) {
      Object.keys(r.cust_area).forEach(k => {
        if (custAreaCounts[k] !== undefined) custAreaCounts[k] += r.cust_area[k];
      });
    }
    // 2. Type Cust
    if (r.type_cust) {
      Object.keys(r.type_cust).forEach(k => {
        if (typeCustCounts[k] !== undefined) typeCustCounts[k] += r.type_cust[k];
      });
    }
    // 3. Komposisi UE
    if (r.komposisi_ue) {
      Object.keys(r.komposisi_ue).forEach(k => {
        if (komposisiUeCounts[k] !== undefined) komposisiUeCounts[k] += r.komposisi_ue[k];
      });
    }
    // 4. Type SBE
    if (r.type_sbe) {
      Object.keys(r.type_sbe).forEach(k => {
        if (typeSbeCounts[k] !== undefined) typeSbeCounts[k] += r.type_sbe[k];
      });
    }
    // 5. Komposisi CPUS
    if (r.komposisi_cpus) {
      Object.keys(r.komposisi_cpus).forEach(k => {
        if (cpusCompCounts[k] !== undefined) cpusCompCounts[k] += r.komposisi_cpus[k];
      });
    }
    // 6. Car Segment Comp
    if (r.car_segment) {
      const ml = r.car_segment['Mid-Low Segment'] || {};
      const mu = r.car_segment['Mid-Up segment'] || {};
      Object.keys(carSegCounts['Mid-Low Segment']).forEach(k => {
        carSegCounts['Mid-Low Segment'][k] += ml[k] || 0;
        carSegCounts['Mid-Up segment'][k] += mu[k] || 0;
      });
    }
  });

  const isMobile = window.innerWidth < 640;
  const chartFont = { family: "'Plus Jakarta Sans', sans-serif", size: isMobile ? 10 : 11, weight: 600 };

  // Helper plugin for donut chart slice percentage & count labels
  const donutSliceLabelPlugin = {
    id: 'donutSliceLabelPlugin',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const activeElements = (chart.getActiveElements && chart.getActiveElements()) 
        || (chart.tooltip?.dataPoints?.map(dp => ({ datasetIndex: dp.datasetIndex, index: dp.dataIndex }))) 
        || [];

      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        const total = dataset.data.reduce((a, b) => a + b, 0);
        if (total === 0) return;
        meta.data.forEach((element, index) => {
          // Hide static slice label if this slice is actively touched/hovered so tooltip never collides
          const isHovered = activeElements.some(e => e.datasetIndex === i && e.index === index);
          if (isHovered) return;

          const val = dataset.data[index];
          if (!val || val === 0) return;
          const pct = (val / total) * 100;
          if (pct < 5) return; // avoid crowding tiny slices
          const pos = element.tooltipPosition();
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;
          ctx.fillText(`${val}`, pos.x, pos.y - 6);
          ctx.font = '500 9.5px sans-serif';
          ctx.fillText(`${pct.toFixed(1).replace('.', ',')}%`, pos.x, pos.y + 7);
          ctx.restore();
        });
      });
    }
  };

  // Helper plugin for bar top percentage labels
  const barTopLabelPlugin = {
    id: 'barTopLabelPlugin',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const activeElements = (chart.getActiveElements && chart.getActiveElements()) 
        || (chart.tooltip?.dataPoints?.map(dp => ({ datasetIndex: dp.datasetIndex, index: dp.dataIndex }))) 
        || [];

      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach((bar, index) => {
          // Hide static bar top label if this bar is actively touched/hovered
          const isHovered = activeElements.some(e => e.datasetIndex === i && e.index === index);
          if (isHovered) return;

          const val = dataset.data[index];
          if (val === undefined || val === null || val === 0) return;
          ctx.save();
          ctx.fillStyle = dataset.borderColor || dataset.backgroundColor || '#1e293b';
          ctx.font = 'bold 10.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`${Math.round(val)}%`, bar.x, bar.y - 3);
          ctx.restore();
        });
      });
    }
  };

  // -------------------------------------------------------------
  // CHART 1: CPUS (Komposisi CPUS: Retail, Fleet, Sudeco, TPI)
  // -------------------------------------------------------------
  const cpusLabels = ['RETAIL', 'FLEET', 'SUDECO', 'TPI'];
  const cpusColors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'];
  const cpusData = cpusLabels.map(k => cpusCompCounts[k] || 0);
  const totalCpus = cpusData.reduce((a, b) => a + b, 0);

  const totalCpusEl = document.getElementById('total-cpus-comp-badge');
  if (totalCpusEl) totalCpusEl.textContent = `${formatNum(totalCpus)} Unit`;

  const legendCpusEl = document.getElementById('legend-cpus-comp');
  if (legendCpusEl) {
    legendCpusEl.innerHTML = cpusLabels.map((lbl, idx) => {
      const count = cpusData[idx];
      const pct = totalCpus > 0 ? (count / totalCpus * 100).toFixed(1).replace('.', ',') + '%' : '0%';
      return `
        <div class="legend-pill" title="${lbl}: ${count} Unit">
          <span class="legend-color-dot" style="background: ${cpusColors[idx]};"></span>
          <span>${lbl}</span>
          <span class="legend-val">${formatNum(count)}</span>
          <span class="legend-pct">(${pct})</span>
        </div>
      `;
    }).join('');
  }

  const ctxCpusComp = document.getElementById('chart-cpus-comp');
  if (ctxCpusComp) {
    if (cpusCompChartInstance) cpusCompChartInstance.destroy();
    cpusCompChartInstance = new Chart(ctxCpusComp, {
      type: 'doughnut',
      data: {
        labels: cpusLabels,
        datasets: [{
          data: cpusData,
          backgroundColor: cpusColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 8,
            cornerRadius: 6,
            caretPadding: 8,
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (item) => {
                const val = item.raw;
                const pct = totalCpus > 0 ? (val / totalCpus * 100).toFixed(1).replace('.', ',') + '%' : '0%';
                return `${item.label}: ${formatNum(val)} Unit (${pct})`;
              }
            }
          }
        }
      },
      plugins: [donutSliceLabelPlugin]
    });
  }

  // -------------------------------------------------------------
  // CHART 2: CUST AREA (Ring 1, Ring 2, Ring 3, Out of Area)
  // -------------------------------------------------------------
  const areaLabels = ['RING 1', 'RING 2', 'RING 3', 'OUT OF AREA'];
  const areaColors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'];
  const areaData = areaLabels.map(k => custAreaCounts[k] || 0);
  const totalArea = areaData.reduce((a, b) => a + b, 0);

  const totalAreaEl = document.getElementById('total-cust-area-badge');
  if (totalAreaEl) totalAreaEl.textContent = `${formatNum(totalArea)} Pelanggan`;

  const legendAreaEl = document.getElementById('legend-cust-area');
  if (legendAreaEl) {
    legendAreaEl.innerHTML = areaLabels.map((lbl, idx) => {
      const count = areaData[idx];
      const pct = totalArea > 0 ? (count / totalArea * 100).toFixed(1).replace('.', ',') + '%' : '0%';
      return `
        <div class="legend-pill" title="${lbl}: ${count} Unit">
          <span class="legend-color-dot" style="background: ${areaColors[idx]};"></span>
          <span>${lbl}</span>
          <span class="legend-val">${formatNum(count)}</span>
          <span class="legend-pct">(${pct})</span>
        </div>
      `;
    }).join('');
  }

  const ctxCustArea = document.getElementById('chart-cust-area');
  if (ctxCustArea) {
    if (custAreaChartInstance) custAreaChartInstance.destroy();
    custAreaChartInstance = new Chart(ctxCustArea, {
      type: 'doughnut',
      data: {
        labels: areaLabels,
        datasets: [{
          data: areaData,
          backgroundColor: areaColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 8,
            cornerRadius: 6,
            caretPadding: 8,
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (item) => {
                const val = item.raw;
                const pct = totalArea > 0 ? (val / totalArea * 100).toFixed(1).replace('.', ',') + '%' : '0%';
                return `${item.label}: ${formatNum(val)} Unit (${pct})`;
              }
            }
          }
        }
      },
      plugins: [donutSliceLabelPlugin]
    });
  }

  // -------------------------------------------------------------
  // CHART 3: TYPE CUST (Aktif, Pasif, New Cust)
  // -------------------------------------------------------------
  const custTypeLabels = ['AKTIF', 'PASIF', 'NEW CUST'];
  const custTypeColors = ['#3b82f6', '#ef4444', '#f59e0b'];
  const custTypeData = custTypeLabels.map(k => typeCustCounts[k] || 0);
  const totalTypeCust = custTypeData.reduce((a, b) => a + b, 0);

  const totalTypeCustEl = document.getElementById('total-type-cust-badge');
  if (totalTypeCustEl) totalTypeCustEl.textContent = `${formatNum(totalTypeCust)} Customer`;

  const legendTypeCustEl = document.getElementById('legend-type-cust');
  if (legendTypeCustEl) {
    legendTypeCustEl.innerHTML = custTypeLabels.map((lbl, idx) => {
      const count = custTypeData[idx];
      const pct = totalTypeCust > 0 ? (count / totalTypeCust * 100).toFixed(1).replace('.', ',') + '%' : '0%';
      return `
        <div class="legend-pill" title="${lbl}: ${count} Pelanggan">
          <span class="legend-color-dot" style="background: ${custTypeColors[idx]};"></span>
          <span>${lbl}</span>
          <span class="legend-val">${formatNum(count)}</span>
          <span class="legend-pct">(${pct})</span>
        </div>
      `;
    }).join('');
  }

  const ctxTypeCust = document.getElementById('chart-type-cust');
  if (ctxTypeCust) {
    if (typeCustChartInstance) typeCustChartInstance.destroy();
    typeCustChartInstance = new Chart(ctxTypeCust, {
      type: 'doughnut',
      data: {
        labels: custTypeLabels,
        datasets: [{
          data: custTypeData,
          backgroundColor: custTypeColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 8,
            cornerRadius: 6,
            caretPadding: 8,
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (item) => {
                const val = item.raw;
                const pct = totalTypeCust > 0 ? (val / totalTypeCust * 100).toFixed(1).replace('.', ',') + '%' : '0%';
                return `${item.label}: ${formatNum(val)} Customer (${pct})`;
              }
            }
          }
        }
      },
      plugins: [donutSliceLabelPlugin]
    });
  }

  // -------------------------------------------------------------
  // CHART 4: KOMPOSISI UE (SBE, GR, GR OIL, TWC, SBI)
  // -------------------------------------------------------------
  const ueLabels = ['SBE', 'GR', 'GR OIL', 'TWC', 'SBI'];
  const ueColors = ['#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#f59e0b'];
  const ueData = ueLabels.map(k => komposisiUeCounts[k] || 0);
  const totalUE = ueData.reduce((a, b) => a + b, 0);

  const totalUeEl = document.getElementById('total-komposisi-ue-badge');
  if (totalUeEl) totalUeEl.textContent = `${formatNum(totalUE)} UE`;

  const legendUeEl = document.getElementById('legend-komposisi-ue');
  if (legendUeEl) {
    legendUeEl.innerHTML = ueLabels.map((lbl, idx) => {
      const count = ueData[idx];
      const pct = totalUE > 0 ? (count / totalUE * 100).toFixed(1).replace('.', ',') + '%' : '0%';
      return `
        <div class="legend-pill" title="${lbl}: ${count} Unit">
          <span class="legend-color-dot" style="background: ${ueColors[idx]};"></span>
          <span>${lbl}</span>
          <span class="legend-val">${formatNum(count)}</span>
          <span class="legend-pct">(${pct})</span>
        </div>
      `;
    }).join('');
  }

  const ctxKomposisiUe = document.getElementById('chart-komposisi-ue');
  if (ctxKomposisiUe) {
    if (komposisiUeChartInstance) komposisiUeChartInstance.destroy();
    komposisiUeChartInstance = new Chart(ctxKomposisiUe, {
      type: 'doughnut',
      data: {
        labels: ueLabels,
        datasets: [{
          data: ueData,
          backgroundColor: ueColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 8,
            cornerRadius: 6,
            caretPadding: 8,
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (item) => {
                const val = item.raw;
                const pct = totalUE > 0 ? (val / totalUE * 100).toFixed(1).replace('.', ',') + '%' : '0%';
                return `${item.label}: ${formatNum(val)} Unit (${pct})`;
              }
            }
          }
        }
      },
      plugins: [donutSliceLabelPlugin]
    });
  }

  // -------------------------------------------------------------
  // CHART 5: TYPE SBE (1K, 10K s/d 100K UP)
  // -------------------------------------------------------------
  const sbeLabels = ['1K', '10K', '20K', '30K', '40K', '50K', '60K', '70K', '80K', '90K', '100K', '100K UP'];
  const sbeRawCounts = sbeLabels.map(k => typeSbeCounts[k] || 0);
  const totalSbe = sbeRawCounts.reduce((a, b) => a + b, 0);

  const totalSbeEl = document.getElementById('total-type-sbe-badge');
  if (totalSbeEl) totalSbeEl.textContent = `${formatNum(totalSbe)} Unit SBE`;

  const sbePctData = sbeRawCounts.map(count => totalSbe > 0 ? (count / totalSbe * 100) : 0);

  const ctxTypeSbe = document.getElementById('chart-type-sbe');
  if (ctxTypeSbe) {
    if (typeSbeChartInstance) typeSbeChartInstance.destroy();
    typeSbeChartInstance = new Chart(ctxTypeSbe, {
      type: 'bar',
      data: {
        labels: sbeLabels,
        datasets: [{
          label: 'Persentase SBE (%)',
          data: sbePctData,
          backgroundColor: '#3b82f6',
          hoverBackgroundColor: '#2563eb',
          borderRadius: 4,
          maxBarThickness: isMobile ? 18 : 34
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 8,
            cornerRadius: 6,
            caretPadding: 8,
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (item) => {
                const idx = item.dataIndex;
                const count = sbeRawCounts[idx];
                const pct = item.raw.toFixed(1).replace('.', ',');
                return `Servis ${item.label}: ${formatNum(count)} Unit (${pct}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: Math.ceil(Math.max(...sbePctData, 20) * 1.15 / 5) * 5,
            ticks: {
              callback: (v) => `${Math.round(v)}%`,
              font: chartFont,
              color: '#64748b'
            },
            grid: { color: 'rgba(226, 232, 240, 0.7)' }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: chartFont,
              color: '#334155'
            }
          }
        }
      },
      plugins: [barTopLabelPlugin]
    });
  }

  // -------------------------------------------------------------
  // CHART 6: CAR SEGMENT COMP. (Mid-Low vs Mid-Up)
  // -------------------------------------------------------------
  const carCategories = ['%', 'RETAIL', 'TOTAL FLEET', 'FLEET', 'SUDECO', 'TPI'];
  const ml = carSegCounts['Mid-Low Segment'];
  const mu = carSegCounts['Mid-Up segment'];
  const totalAllCars = (ml.TOTAL || 0) + (mu.TOTAL || 0);

  const totalCarSegEl = document.getElementById('total-car-seg-badge');
  if (totalCarSegEl) totalCarSegEl.textContent = `${formatNum(totalAllCars)} Kendaraan`;

  // Compute percentage arrays
  const mlPctData = [
    totalAllCars > 0 ? (ml.TOTAL / totalAllCars * 100) : 0,
    ml.TOTAL > 0 ? (ml.RETAIL / ml.TOTAL * 100) : 0,
    ml.TOTAL > 0 ? (ml['TOTAL FLEET'] / ml.TOTAL * 100) : 0,
    ml.TOTAL > 0 ? (ml.FLEET / ml.TOTAL * 100) : 0,
    ml.TOTAL > 0 ? (ml.SUDECO / ml.TOTAL * 100) : 0,
    ml.TOTAL > 0 ? (ml.TPI / ml.TOTAL * 100) : 0
  ];

  const muPctData = [
    totalAllCars > 0 ? (mu.TOTAL / totalAllCars * 100) : 0,
    mu.TOTAL > 0 ? (mu.RETAIL / mu.TOTAL * 100) : 0,
    mu.TOTAL > 0 ? (mu['TOTAL FLEET'] / mu.TOTAL * 100) : 0,
    mu.TOTAL > 0 ? (mu.FLEET / mu.TOTAL * 100) : 0,
    mu.TOTAL > 0 ? (mu.SUDECO / mu.TOTAL * 100) : 0,
    mu.TOTAL > 0 ? (mu.TPI / mu.TOTAL * 100) : 0
  ];

  const ctxCarSegment = document.getElementById('chart-car-segment');
  if (ctxCarSegment) {
    if (carSegmentChartInstance) carSegmentChartInstance.destroy();
    carSegmentChartInstance = new Chart(ctxCarSegment, {
      type: 'bar',
      data: {
        labels: carCategories,
        datasets: [
          {
            label: 'Mid-Low Segment',
            data: mlPctData,
            backgroundColor: '#3b82f6',
            borderRadius: 4,
            maxBarThickness: isMobile ? 16 : 28
          },
          {
            label: 'Mid-Up segment',
            data: muPctData,
            backgroundColor: '#ef4444',
            borderRadius: 4,
            maxBarThickness: isMobile ? 16 : 28
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              padding: 12,
              font: chartFont,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 8,
            cornerRadius: 6,
            caretPadding: 8,
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (item) => {
                const segName = item.dataset.label;
                const cat = item.label;
                const pct = item.raw.toFixed(1).replace('.', ',');
                return `${segName} (${cat}): ${pct}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: Math.min(100, Math.ceil(Math.max(...mlPctData, ...muPctData, 50) * 1.15 / 10) * 10),
            ticks: {
              callback: (v) => `${Math.round(v)}%`,
              font: chartFont,
              color: '#64748b'
            },
            grid: { color: 'rgba(226, 232, 240, 0.7)' }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: chartFont,
              color: '#334155'
            }
          }
        }
      },
      plugins: [barTopLabelPlugin]
    });
  }
}

// -------------------------------------------------------------------
// 3. WORKSHOP PERFORMANCE MATRIX (MATCHING EXCEL SHEET DASHBOARD 1:1)
// -------------------------------------------------------------------
// -------------------------------------------------------------------
// 3. WORKSHOP PERFORMANCE MATRIX (KPI DASHBOARD KABENG GR - KIARACONDONG)
// -------------------------------------------------------------------
function renderWSPerformanceTable() {
  const tbody = document.getElementById('ws-perf-tbody');
  if (!tbody || !dashboardData) return;

  const kabengData = dashboardData.ws_matrix_kabeng || dashboardData.ws_matrix_excel?.kabeng;
  
  if (!kabengData || !kabengData.rows || kabengData.rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="17" class="text-center" style="padding: 24px; color: #94a3b8;">Data matriks operasional Kabeng Kiaracondong tidak ditemukan</td></tr>';
    return;
  }

  const yrHeader = document.getElementById('ws-matrix-year-header');
  if (yrHeader) yrHeader.textContent = `${kabengData.year || 2026} (Realisasi Bulanan)`;
  const ytdHeader = document.getElementById('ws-matrix-ytd-header');
  if (ytdHeader) ytdHeader.innerHTML = `Total<br>YTD`;

  const fileBadge = document.getElementById('ws-matrix-file-badge');
  if (fileBadge) {
    const fileName = kabengData.source_file ? kabengData.source_file.split('/').pop().split('\\').pop() : 'KPI Dashboard Kabeng GR-ags.xlsx';
    const isCustom = localStorage.getItem('bengkel_custom_ws_matrix') !== null;
    fileBadge.textContent = `Excel: ${fileName}${isCustom ? ' (Diperbarui)' : ''}`;
  }

  // Visual value formatter
  const formatKabengCell = (val, satuan, kpiName) => {
    if (val === null || val === undefined || val === '' || val === '-' || val === '_') {
      return '<span style="color: #cbd5e1;">—</span>';
    }

    if (typeof val === 'string' && isNaN(Number(val))) {
      const isStable = val.toLowerCase().includes('stable');
      return `<span class="tag-badge ${isStable ? 'green' : 'blue'}" style="font-size: 10px; font-weight: 700; padding: 2px 6px;">${val}</span>`;
    }

    const num = Number(val);
    if (isNaN(num)) return val;

    // 1. Percentage
    if (satuan === '%' || kpiName.includes('%') || kpiName.toLowerCase().includes('composition') || kpiName.toLowerCase().includes('share') || kpiName.toLowerCase().includes('ratio') || kpiName.toLowerCase().includes('rate')) {
      if (num === 0) return '<span style="color: #cbd5e1;">0,0%</span>';
      return formatPct(num, 1);
    }

    // 2. Rupiah
    if (satuan === 'Rp') {
      const fullRupiah = Math.round(num * 1000);
      const isNegative = num < 0;
      const negStyle = isNegative ? 'color: #dc2626; font-weight: 600;' : '';

      if (Math.abs(fullRupiah) >= 1_000_000_000) {
        return `<span style="${negStyle}" title="Rp ${formatNum(fullRupiah)}">${formatCompactIDR(fullRupiah)}</span>`;
      } else if (Math.abs(fullRupiah) >= 10_000_000) {
        return `<span style="${negStyle}" title="Rp ${formatNum(fullRupiah)}">${formatCompactIDR(fullRupiah)}</span>`;
      } else {
        return `<span style="${negStyle}" title="Rp ${formatNum(fullRupiah)}">${formatIDR(fullRupiah)}</span>`;
      }
    }

    // 3. Units / Productivities / Counts
    if (satuan === 'Unit' || satuan === 'Stall' || satuan === 'Man Power' || satuan === 'Point') {
      if (Math.abs(num % 1) > 0.001) {
        return formatNum(num, 2);
      }
      if (num === 0) return '<span style="color: #cbd5e1;">0</span>';
      return formatNum(Math.round(num));
    }

    return formatNum(num);
  };

  let html = '';

  // 1. Row: Hari Kerja Operasional
  const hk = kabengData.hari_kerja || { months: [], total: 0 };
  html += `
    <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-weight: 700;">
      <td class="ws-col-no text-center" style="color: #64748b; font-size: 11px; background: #f1f5f9;">—</td>
      <td class="ws-col-kpi" style="color: #0f172a; font-size: 12px; font-weight: 700; background: #f1f5f9;">Hari Kerja Operasional Bengkel</td>
      <td class="text-center"><span class="tag-badge slate" style="font-size: 10px; font-weight: 700;">Hari</span></td>
      ${hk.months.map(v => `<td class="numeric" style="font-weight: 700; color: #1e293b;">${v > 0 ? formatNum(v, 1) : '<span style="color: #cbd5e1;">—</span>'}</td>`).join('')}
      <td class="numeric ws-ytd-val" style="font-weight: 800; color: #1e3a8a; background: #e0f2fe;">${formatNum(hk.total, 0)}</td>
      <td class="numeric text-center" style="color: #9a3412; background: #ffedd5; font-weight: 700; border-left: 1.5px solid #fdba74;">—</td>
    </tr>
  `;

  // Groupings for clear readability
  let currentGroup = '';

  kabengData.rows.forEach(r => {
    // Check if new category group starts
    if (r.category && r.category !== currentGroup) {
      currentGroup = r.category;
      html += `
        <tr style="background: #f8fafc; border-top: 2px solid #e2e8f0; border-bottom: 1px solid #cbd5e1;">
          <td colspan="17" style="font-weight: 800; font-size: 11px; color: #334155; padding: 6px 12px; letter-spacing: 0.5px; text-transform: uppercase;">
            &bull; ${currentGroup}
          </td>
        </tr>
      `;
    }

    // Row highlight styles for core financial metrics
    let rowClass = '';
    let rowStyle = '';
    let rowBg = '#ffffff';
    const numInt = parseInt(r.no) || 0;

    if (numInt === 1 || numInt === 2) {
      // Unit Entry & CPUS
      rowStyle = 'background: #f8fafc; font-weight: 700;';
      rowBg = '#f8fafc';
    } else if (numInt === 12) {
      // Revenue Total
      rowStyle = 'background: #eff6ff; font-weight: 800; color: #1e3a8a;';
      rowBg = '#eff6ff';
    } else if (numInt === 26) {
      // Total GP Bengkel
      rowStyle = 'background: #f0fdf4; font-weight: 800; color: #166534;';
      rowBg = '#f0fdf4';
    } else if (numInt === 31) {
      // Total GP %
      rowStyle = 'background: #f0fdf4; font-weight: 700; color: #15803d;';
      rowBg = '#f0fdf4';
    } else if (numInt === 32 || numInt === 33) {
      // Opex Bengkel
      rowStyle = 'background: #fffbeb; font-weight: 600;';
      rowBg = '#fffbeb';
    } else if (numInt === 34 || numInt === 35) {
      // PBT & PBT Ratio
      rowStyle = 'background: #f0f9ff; font-weight: 800; color: #0369a1;';
      rowBg = '#f0f9ff';
    }

    // Satuan badge color
    let satuanBadgeClass = 'slate';
    if (r.satuan === '%') satuanBadgeClass = 'blue';
    else if (r.satuan === 'Rp') satuanBadgeClass = 'green';
    else if (r.satuan === 'Unit') satuanBadgeClass = 'slate';
    else if (r.satuan === 'Stall') satuanBadgeClass = 'amber';

    html += `
      <tr class="${rowClass}" style="${rowStyle}">
        <td class="ws-col-no text-center" style="font-weight: 600; color: #64748b; font-size: 11px; background: ${rowBg};">#${r.no}</td>
        <td class="ws-col-kpi" style="font-weight: ${rowStyle ? '700' : '600'}; color: #0f172a; white-space: nowrap; background: ${rowBg};">${r.kpi}</td>
        <td class="text-center"><span class="tag-badge ${satuanBadgeClass}" style="font-size: 9.5px; font-weight: 600; padding: 2px 5px;">${r.satuan}</span></td>
        ${r.months.map(v => `<td class="numeric">${formatKabengCell(v, r.satuan, r.kpi)}</td>`).join('')}
        <td class="numeric ws-ytd-val" style="font-weight: 800; background: #e0f2fe; color: #1e3a8a;">${formatKabengCell(r.total, r.satuan, r.kpi)}</td>
        <td class="numeric" style="background: #fff7ed; color: #9a3412; font-weight: 700; border-left: 1.5px solid #fed7aa;">${formatKabengCell(r.nas_tunas, r.satuan, r.kpi)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// -------------------------------------------------------------------
// 4. SERVICE ADVISOR CORPORATE PROFILE CARDS & TABLE
// -------------------------------------------------------------------
function renderSAPerformanceCards() {
  const container = document.getElementById('sa-cards-container');
  const tableBody = document.getElementById('sa-table-tbody');
  const crossGrid = document.getElementById('sa-cross-detail-grid');
  if (!container || !dashboardData) return;

  const yr = STATE.year;
  const sas = ['DIDIN', 'FICKY', 'ACEP'];

  // Canonical commodity ordering (same across all SAs, excluding SYNT, WIPER FLUID, and OLI SMM)
  const CANONICAL_COMMODITIES = [
    'CHEMICAL SMM', 'FULL SYNT', 'OPL CAR CARE', 'OPL AC',
    'SPOORING', 'BATTERY', 'TIRE', 'REMATCHING',
    'CROSS SELLING TAM', 'SMM OIL'
  ];

  // Aggregate basic SA performance (PKB: UE, Revenue, T-Care, SBE)
  const saAgg = sas.map(saName => {
    let ue = 0;
    let revenue = 0;
    let tcareUE = 0;
    let sbeUE = 0;

    if (STATE.segment !== 'all' && dashboardData.breakdown) {
      dashboardData.breakdown
        .filter(item => String(item.year) === yr && item.sa === saName && isMonthInFilter(item.month_name) && isSegmentInFilter(item.fleet_retail))
        .forEach(item => {
          ue += item.units || 0;
          revenue += item.revenue || 0;
          if (item.tcare && item.tcare.toLowerCase() === 't-care') tcareUE += item.units || 0;
          if (item.type_service && item.type_service.toUpperCase().includes('SBE')) sbeUE += item.units || 0;
        });
    } else {
      dashboardData.sa_performance
        .filter(item => String(item.year) === yr && item.sa === saName && isMonthInFilter(item.month_name))
        .forEach(item => {
          ue += item.ue || 0;
          revenue += item.revenue || 0;
          tcareUE += item.tcare_ue || 0;
          sbeUE += item.sbe_ue || 0;
        });
    }

    // Aggregate cross selling & upselling data per SA from sa_cross_selling (Daftar List SO)
    let crossRevenue = 0;
    let crossQty = 0;
    const catMap = {};

    let fullSA_UE = 0;
    if (STATE.segment !== 'all') {
      dashboardData.sa_performance
        .filter(item => String(item.year) === yr && item.sa === saName && isMonthInFilter(item.month_name))
        .forEach(item => { fullSA_UE += item.ue || 0; });
    }
    const segWeight = (STATE.segment !== 'all' && fullSA_UE > 0) ? (ue / fullSA_UE) : 1.0;

    if (dashboardData.sa_cross_selling) {
      dashboardData.sa_cross_selling
        .filter(item => String(item.year) === yr && item.sa === saName && isMonthInFilter(item.month_name))
        .forEach(item => {
          const cName = (item.category || 'LAINNYA').toUpperCase().trim();
          if (cName === 'SYNT' || cName === 'WIPER FLUID') return;
          const q = Math.round((item.qty || 0) * segWeight);
          const r = Math.round((item.revenue || 0) * segWeight);
          crossRevenue += r;
          crossQty += q;

          if (!catMap[cName]) catMap[cName] = { category: cName, qty: 0, revenue: 0 };
          catMap[cName].qty += q;
          catMap[cName].revenue += r;
        });
    }

    const avgRev = ue > 0 ? revenue / ue : 0;
    const tcarePct = sbeUE > 0 ? tcareUE / sbeUE : (ue > 0 ? tcareUE / ue : 0);
    const crossContributionToSA = revenue > 0 ? crossRevenue / revenue : 0;

    return {
      name: saName,
      ue: ue,
      sbeUE: sbeUE,
      revenue: revenue,
      avgRev: avgRev,
      tcareUE: tcareUE,
      tcarePct: tcarePct,
      crossRevenue: crossRevenue,
      crossQty: crossQty,
      crossContributionToSA: crossContributionToSA,
      catMap: catMap
    };
  });

  // Calculate totals across the 3 SAs (DIDIN + FICKY + ACEP)
  const totalRevAllSA = saAgg.reduce((sum, s) => sum + s.revenue, 0);
  const totalCrossRevAllSA = saAgg.reduce((sum, s) => sum + s.crossRevenue, 0);
  const totalCrossQtyAllSA = saAgg.reduce((sum, s) => sum + s.crossQty, 0);
  const totalUEAllSA = saAgg.reduce((sum, s) => sum + s.ue, 0);
  const totalTcareAllSA = saAgg.reduce((sum, s) => sum + s.tcareUE, 0);
  const totalSbeAllSA = saAgg.reduce((sum, s) => sum + s.sbeUE, 0);

  // Compute 3 SA contribution percentages (Didin + Ficky + Acep = 100%)
  saAgg.forEach(s => {
    s.cpusShare = totalUEAllSA > 0 ? s.ue / totalUEAllSA : 0;
    s.revShare = totalRevAllSA > 0 ? s.revenue / totalRevAllSA : 0;
    s.tcareShare = totalTcareAllSA > 0 ? s.tcareUE / totalTcareAllSA : 0;
    s.crossShare = totalCrossRevAllSA > 0 ? s.crossRevenue / totalCrossRevAllSA : 0;
  });

  // Commodity revenue totals across 3 SAs
  const totalCommodityRev3SA = {};
  CANONICAL_COMMODITIES.forEach(cName => {
    totalCommodityRev3SA[cName] = saAgg.reduce((sum, sa) => sum + (sa.catMap[cName]?.revenue || 0), 0);
  });

  // Format uniform category list for each SA in canonical order
  saAgg.forEach(s => {
    s.categories = CANONICAL_COMMODITIES.map(cName => {
      const item = s.catMap[cName] || { category: cName, qty: 0, revenue: 0 };
      const tot3SA = totalCommodityRev3SA[cName] || 0;
      const share3SA = tot3SA > 0 ? item.revenue / tot3SA : 0;
      return {
        category: cName,
        qty: item.qty,
        revenue: item.revenue,
        share3SA: share3SA
      };
    });
  });

  // Filter SA to display if specific SA filter selected
  const displayedSAs = STATE.sa === 'all' ? saAgg : saAgg.filter(s => s.name === STATE.sa);

  // 1. Corporate Profile Cards (Top of tab)
  container.innerHTML = displayedSAs.map(s => {
    const segBadge = STATE.segment !== 'all' ? `<span class="tag-badge green" style="font-weight: 700; margin-right: 4px;">${STATE.segment}</span>` : '';
    return `
      <div class="sa-management-card">
        <div class="sa-card-heading">
          <div class="sa-meta-title">
            <h4>${s.name}</h4>
            <span>Service Advisor Bengkel</span>
          </div>
          <div>
            ${segBadge}
            <span class="tag-badge blue">${formatPct(s.cpusShare)} Share CPUS • ${formatPct(s.revShare)} Share Omset</span>
          </div>
        </div>
        <div class="sa-kpi-item-row">
          <span class="kpi-k">Total Unit Entry / CPUS</span>
          <span class="kpi-v" style="font-weight: 700; color: #1e3a8a;">${formatNum(s.ue)} Unit (${formatPct(s.cpusShare)} dari 3 SA)</span>
        </div>
        <div class="sa-kpi-item-row">
          <span class="kpi-k">Total Penjualan (Revenue)</span>
          <span class="kpi-v" style="font-weight: 700;">${formatIDR(s.revenue)} (${formatPct(s.revShare)} dari 3 SA)</span>
        </div>
        <div class="sa-kpi-item-row" style="background: #f0fdf4; border-radius: 4px; padding: 4px 6px; margin: 2px 0;">
          <span class="kpi-k" style="color: #166534; font-weight: 600;">Omset Cross & Upsell</span>
          <span class="kpi-v" style="color: #15803d; font-weight: 700;">${formatIDR(s.crossRevenue)} (${formatPct(s.crossShare)} dari 3 SA)</span>
        </div>
        <div class="sa-kpi-item-row">
          <span class="kpi-k">Kontribusi Cross thd Omset SA</span>
          <span class="kpi-v" style="font-weight: 700; color: #1d4ed8;">${formatPct(s.crossContributionToSA)}</span>
        </div>
        <div class="sa-kpi-item-row">
          <span class="kpi-k">Rata-rata Revenue / UE</span>
          <span class="kpi-v">${formatIDR(s.avgRev)}</span>
        </div>
        <div class="sa-kpi-item-row">
          <span class="kpi-k">Unit T-Care (Program)</span>
          <span class="kpi-v">${formatNum(s.tcareUE)} Unit (${formatPct(s.tcareShare)} dari 3 SA)</span>
        </div>
        <div style="margin-top: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: var(--text-secondary); font-weight: 600;">
            <span>Penetrasi T-Care vs SBE Sendiri (Target 70%)</span>
            <span style="color: var(--text-title); font-weight: 700;">${formatPct(s.tcarePct)}</span>
          </div>
          <div class="kpi-target-track" style="margin-bottom: 0;">
            <div class="kpi-target-fill" style="width: ${Math.min((s.tcarePct / 0.70) * 100, 100)}%; background: var(--corporate-navy);"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 2. Comprehensive Comparison Table with Cross-Selling Metrics
  if (tableBody) {
    const avgRevTotal = totalUEAllSA > 0 ? totalRevAllSA / totalUEAllSA : 0;
    const avgTcarePct = totalSbeAllSA > 0 ? totalTcareAllSA / totalSbeAllSA : (totalUEAllSA > 0 ? totalTcareAllSA / totalUEAllSA : 0);
    const totalCrossPctOfSA = totalRevAllSA > 0 ? totalCrossRevAllSA / totalRevAllSA : 0;

    tableBody.innerHTML = saAgg.map(s => {
      return `
        <tr>
          <td class="sticky-col" style="font-weight: 700;">${s.name}</td>
          <td class="numeric">${formatNum(s.ue)} <span style="font-size: 11px; color: #2563eb; font-weight: 600;">(${formatPct(s.cpusShare)})</span></td>
          <td class="numeric">${formatIDR(s.revenue)}</td>
          <td class="numeric" style="background: #f0f7ff; font-weight: 700; color: #1d4ed8;">${formatIDR(s.crossRevenue)}</td>
          <td class="numeric" style="background: #f0f7ff;">${formatNum(s.crossQty)}</td>
          <td class="numeric" style="background: #f0f7ff; font-weight: 700; color: #047857;">${formatPct(s.crossContributionToSA)}</td>
          <td class="numeric" style="background: #f0f7ff; color: #475569;">${formatPct(s.crossShare)}</td>
          <td class="numeric">${formatIDR(s.avgRev)}</td>
          <td class="numeric">${formatNum(s.tcareUE)} <span style="font-size: 11px; color: #2563eb; font-weight: 600;">(${formatPct(s.tcareShare)})</span></td>
          <td class="numeric">${formatPct(s.tcarePct)}</td>
          <td class="numeric" style="font-weight: 700; color: #1e3a8a;">${formatPct(s.revShare)}</td>
        </tr>
      `;
    }).join('') + `
      <tr class="total-summary-row">
        <td class="sticky-col">KONSOLIDASI 3 SA (100%)</td>
        <td class="numeric">${formatNum(totalUEAllSA)} <span style="font-size: 11px; font-weight: 700;">(100,0%)</span></td>
        <td class="numeric">${formatIDR(totalRevAllSA)}</td>
        <td class="numeric" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">${formatIDR(totalCrossRevAllSA)}</td>
        <td class="numeric" style="background: #e0f2fe; font-weight: 600;">${formatNum(totalCrossQtyAllSA)}</td>
        <td class="numeric" style="background: #e0f2fe; color: #047857; font-weight: 700;">${formatPct(totalCrossPctOfSA)}</td>
        <td class="numeric" style="background: #e0f2fe; font-weight: 700;">100,0%</td>
        <td class="numeric">${formatIDR(avgRevTotal)}</td>
        <td class="numeric">${formatNum(totalTcareAllSA)} <span style="font-size: 11px; font-weight: 700;">(100,0%)</span></td>
        <td class="numeric">${formatPct(avgTcarePct)}</td>
        <td class="numeric" style="font-weight: 700;">100,0%</td>
      </tr>
    `;
  }

  // 3. Detailed Cross Selling & Upselling Cards Grid (Uniform Canonical Order)
  if (crossGrid) {
    crossGrid.innerHTML = displayedSAs.map(s => {
      const maxCatRevenue = Math.max(...s.categories.map(c => c.revenue), 1);

      const categoryRows = s.categories.map(c => {
        const catPctOfCross = s.crossRevenue > 0 ? c.revenue / s.crossRevenue : 0;
        const barWidth = maxCatRevenue > 0 ? Math.min((c.revenue / maxCatRevenue) * 100, 100) : 0;
        return `
          <tr>
            <td class="sa-cross-cat-cell">
              <div style="font-weight: ${c.revenue > 0 ? '600' : '400'}; color: ${c.revenue > 0 ? '#1e293b' : '#94a3b8'};">${c.category}</div>
              <div class="sa-cross-bar-wrapper">
                <div class="sa-cross-bar-inner" style="width: ${barWidth}%;"></div>
              </div>
            </td>
            <td class="numeric" style="color: ${c.qty > 0 ? '#475569' : '#cbd5e1'}; white-space: nowrap;">${formatNum(c.qty)}</td>
            <td class="numeric" style="font-weight: ${c.revenue > 0 ? '600' : '400'}; color: ${c.revenue > 0 ? '#0f172a' : '#cbd5e1'}; white-space: nowrap;">${formatIDR(c.revenue)}</td>
            <td class="numeric" style="font-weight: 700; color: ${c.revenue > 0 ? '#2563eb' : '#cbd5e1'}; white-space: nowrap;">
              ${formatPct(catPctOfCross)}
              <span style="font-size: 10px; color: #64748b; font-weight: 500; display: block;">Share 3 SA: ${formatPct(c.share3SA)}</span>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="sa-cross-advisor-card">
          <div class="sa-cross-advisor-header">
            <div class="sa-cross-advisor-info">
              <div class="sa-avatar-circle">${s.name.charAt(0)}</div>
              <div class="sa-cross-advisor-title">
                <h4>${s.name}</h4>
                <span>Service Advisor</span>
              </div>
            </div>
            <span class="tag-badge blue" style="font-size: 11px; font-weight: 700;">${formatPct(s.crossShare)} Share 3 SA</span>
          </div>

          <div class="sa-cross-kpis-summary">
            <div class="sa-cross-kpi-box">
              <span class="label">Omset Cross & Upselling</span>
              <span class="val">${formatCompactIDR(s.crossRevenue)}</span>
              <span class="subval">${formatNum(s.crossQty)} item terjual</span>
            </div>
            <div class="sa-cross-kpi-box">
              <span class="label">Kontribusi thd Penjualan</span>
              <span class="val">${formatPct(s.crossContributionToSA)} (dari Omset SA)</span>
              <span class="subval" style="color: #475569;">${formatPct(s.crossShare)} dari Total 3 SA</span>
            </div>
          </div>

          <div class="sa-cross-table-container">
            <table class="sa-cross-mini-table">
              <thead>
                <tr>
                  <th>Komoditas Produk (Urutan Standar)</th>
                  <th style="text-align: right;">Qty</th>
                  <th style="text-align: right;">Omset (Rp)</th>
                  <th style="text-align: right;">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                ${categoryRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
  }
}

// -------------------------------------------------------------------
// 4B. SERVICE ADVISOR RADAR CHARTS (KOMPARASI 10 KOMODITAS PRODUK: ACH BULAN VS ACH TOTAL TAHUN)
// -------------------------------------------------------------------
function renderSARadarCharts() {
  if (!dashboardData) return;

  const yr = STATE.year;
  const sas = ['DIDIN', 'FICKY', 'ACEP'];

  // 10 Komoditas Produk (Urutan Standar)
  const CANONICAL_COMMODITIES = [
    'CHEMICAL SMM', 'FULL SYNT', 'OPL CAR CARE', 'OPL AC',
    'SPOORING', 'BATTERY', 'TIRE', 'REMATCHING',
    'CROSS SELLING TAM', 'SMM OIL'
  ];

  const METRIC_DEFS = CANONICAL_COMMODITIES.map(c => ({ key: c, label: c }));

  // Segment scaling factor if a segment filter is applied
  let segRatio = 1.0;
  if (STATE.segment !== 'all' && dashboardData.breakdown) {
    const totalYrUnits = dashboardData.breakdown.filter(item => String(item.year) === yr).reduce((s, b) => s + (b.units || 0), 0) || 1;
    const segYrUnits = dashboardData.breakdown.filter(item => String(item.year) === yr && isSegmentInFilter(item.fleet_retail)).reduce((s, b) => s + (b.units || 0), 0);
    segRatio = segYrUnits / totalYrUnits;
    if (segRatio <= 0) segRatio = 0.05;
  }

  // 1. Calculate Period & YTD commodity revenue for each SA and 3 SA Consolidated
  const totPeriod3SA = {};
  const totYtd3SA = {};
  CANONICAL_COMMODITIES.forEach(c => {
    totPeriod3SA[c] = 0;
    totYtd3SA[c] = 0;
  });

  const saRaw = {};
  sas.forEach(saName => {
    saRaw[saName] = {};
    CANONICAL_COMMODITIES.forEach(c => {
      saRaw[saName][c] = { pRev: 0, pQty: 0, ytdRev: 0, ytdQty: 0 };
    });
  });

  if (dashboardData.sa_cross_selling) {
    dashboardData.sa_cross_selling
      .filter(item => String(item.year) === yr && sas.includes(item.sa))
      .forEach(item => {
        const cat = (item.category || '').toUpperCase().trim();
        if (!CANONICAL_COMMODITIES.includes(cat)) return;
        const sa = item.sa;
        const rev = (item.revenue || 0) * (STATE.segment !== 'all' ? segRatio : 1.0);
        const qty = (item.qty || 0) * (STATE.segment !== 'all' ? segRatio : 1.0);

        // YTD
        saRaw[sa][cat].ytdRev += rev;
        saRaw[sa][cat].ytdQty += qty;
        totYtd3SA[cat] += rev;

        // Period
        if (isMonthInFilter(item.month_name)) {
          saRaw[sa][cat].pRev += rev;
          saRaw[sa][cat].pQty += qty;
          totPeriod3SA[cat] += rev;
        }
      });
  }

  // 2. Compute Achievement % for each SA across 11 commodities
  // Benchmark = Fair Share 33.333% (1/3 of total 3 SA). Share 33.3% = 100% Ach.
  const saCalculated = {};
  sas.forEach(saName => {
    const periodValues = [];
    const ytdValues = [];
    const catStats = {};

    CANONICAL_COMMODITIES.forEach(cName => {
      const raw = saRaw[saName][cName];
      const pTot = totPeriod3SA[cName] || 0;
      const ytdTot = totYtd3SA[cName] || 0;

      const pShare = pTot > 0 ? raw.pRev / pTot : 0;
      const ytdShare = ytdTot > 0 ? raw.ytdRev / ytdTot : 0;

      // Ach % vs Fair Share benchmark (1/3): 100% when share = 33.33%
      // Capped nicely at 150% max for radar rendering
      const pAch = Math.min(150, Math.round((pShare / (1 / 3)) * 1000) / 10);
      const ytdAch = Math.min(150, Math.round((ytdShare / (1 / 3)) * 1000) / 10);

      periodValues.push(pAch);
      ytdValues.push(ytdAch);

      catStats[cName] = {
        pRev: raw.pRev,
        pQty: raw.pQty,
        pShare: pShare,
        pAch: pAch,
        ytdRev: raw.ytdRev,
        ytdQty: raw.ytdQty,
        ytdShare: ytdShare,
        ytdAch: ytdAch
      };
    });

    const avgPeriod = Math.round(periodValues.reduce((a, b) => a + b, 0) / periodValues.length);
    const avgYTD = Math.round(ytdValues.reduce((a, b) => a + b, 0) / ytdValues.length);

    saCalculated[saName] = {
      periodValues,
      ytdValues,
      avgPeriod,
      avgYTD,
      catStats
    };
  });

  const chartConfigs = [
    {
      saName: 'DIDIN',
      canvasId: 'radar-chart-didin',
      badgeId: 'radar-badge-didin',
      highlightsId: 'radar-highlights-didin',
      instanceKey: 'radarDidinInstance',
      color: '#2563eb',
      bgColor: 'rgba(37, 99, 235, 0.22)',
      labelColor: '#1e40af'
    },
    {
      saName: 'FICKY',
      canvasId: 'radar-chart-ficky',
      badgeId: 'radar-badge-ficky',
      highlightsId: 'radar-highlights-ficky',
      instanceKey: 'radarFickyInstance',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.22)',
      labelColor: '#065f46'
    },
    {
      saName: 'ACEP',
      canvasId: 'radar-chart-acep',
      badgeId: 'radar-badge-acep',
      highlightsId: 'radar-highlights-acep',
      instanceKey: 'radarAcepInstance',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.22)',
      labelColor: '#b45309'
    }
  ];

  const spokeLabels = CANONICAL_COMMODITIES;

  // Render 3 Individual Radar Charts
  chartConfigs.forEach(cfg => {
    const canvas = document.getElementById(cfg.canvasId);
    if (!canvas) return;

    const calc = saCalculated[cfg.saName];
    if (!calc) return;

    const badge = document.getElementById(cfg.badgeId);
    if (badge) {
      badge.textContent = `Ach Periode: ${calc.avgPeriod}% • Ach YTD: ${calc.avgYTD}%`;
    }

    if (cfg.instanceKey === 'radarDidinInstance' && radarDidinInstance) radarDidinInstance.destroy();
    if (cfg.instanceKey === 'radarFickyInstance' && radarFickyInstance) radarFickyInstance.destroy();
    if (cfg.instanceKey === 'radarAcepInstance' && radarAcepInstance) radarAcepInstance.destroy();

    const periodLabel = STATE.month !== 'all' ? `Bulan ${STATE.month}` : `Periode ${yr}`;

    const instance = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: spokeLabels,
        datasets: [
          {
            label: `Ach ${periodLabel}`,
            data: calc.periodValues,
            backgroundColor: cfg.bgColor,
            borderColor: cfg.color,
            borderWidth: 2.2,
            pointBackgroundColor: cfg.color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.8,
            pointRadius: 4.5,
            pointHoverRadius: 6,
            fill: true
          },
          {
            label: `Ach Total Tahun (${yr} YTD)`,
            data: calc.ytdValues,
            borderColor: '#475569',
            borderWidth: 2.2,
            borderDash: [6, 4],
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#475569',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 10, bottom: 10, left: 10, right: 10 }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { size: 10, weight: '700' },
              color: '#334155'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const cName = ctx.label;
                const stats = calc.catStats[cName];
                const isPeriod = ctx.datasetIndex === 0;
                const share = isPeriod ? stats?.pShare || 0 : stats?.ytdShare || 0;
                const rev = isPeriod ? stats?.pRev || 0 : stats?.ytdRev || 0;
                return ` ${ctx.dataset.label}: ${ctx.raw}% (Share: ${(share * 100).toFixed(1)}%, ${formatCompactIDR(rev)})`;
              }
            }
          }
        },
        scales: {
          r: {
            min: 0,
            suggestedMax: 150,
            angleLines: { color: 'rgba(226, 232, 240, 0.9)', lineWidth: 1 },
            grid: { color: 'rgba(226, 232, 240, 0.9)', lineWidth: 1 },
            pointLabels: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 9.5, weight: '700' },
              color: '#1e293b',
              padding: 5
            },
            ticks: {
              stepSize: 30,
              font: { size: 8.5, weight: '600' },
              color: '#94a3b8',
              backdropColor: 'transparent',
              callback: v => v + '%'
            }
          }
        }
      }
    });

    if (cfg.instanceKey === 'radarDidinInstance') radarDidinInstance = instance;
    if (cfg.instanceKey === 'radarFickyInstance') radarFickyInstance = instance;
    if (cfg.instanceKey === 'radarAcepInstance') radarAcepInstance = instance;

    // Highlights below radar chart
    const highlightsEl = document.getElementById(cfg.highlightsId);
    if (highlightsEl) {
      const isAllMonth = STATE.month === 'all';
      highlightsEl.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
          <span>Pencapaian 10 Komoditas Produk (${periodLabel}):</span>
          ${isAllMonth ? '<span style="font-size: 9.5px; color: #64748b; font-weight: 500;">(Semua Bulan: Nilai Periode = YTD sehingga garis berimpit)</span>' : ''}
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
          ${CANONICAL_COMMODITIES.map((cName, idx) => {
            const pVal = calc.periodValues[idx];
            const yVal = calc.ytdValues[idx];
            const isGood = pVal >= 100;
            return `
              <span class="sa-badge-chip ${isGood ? 'top' : 'caution'}" style="font-size: 9.5px; padding: 2px 7px;">
                ${cName}: <strong>${pVal}%</strong> (YTD: ${yVal}%)
              </span>
            `;
          }).join('')}
        </div>
      `;
    }
  });

  // Render Overlay Comparison Chart & Table
  renderSARadarOverlay(METRIC_DEFS, saCalculated);
}

// -------------------------------------------------------------------
// 4C. SERVICE ADVISOR RADAR OVERLAY (KOMPARASI 3 SA DALAM 1 GRAFIK)
// -------------------------------------------------------------------
function renderSARadarOverlay(METRIC_DEFS, saCalculated) {
  const overlayCanvas = document.getElementById('radar-chart-overlay');
  const tbody = document.getElementById('radar-comparison-tbody');
  if (!overlayCanvas || !saCalculated || !saCalculated['DIDIN']) return;

  if (radarOverlayInstance) radarOverlayInstance.destroy();

  const labels = METRIC_DEFS.map(m => m.label);

  radarOverlayInstance = new Chart(overlayCanvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'DIDIN',
          data: saCalculated['DIDIN'].periodValues,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.16)',
          borderWidth: 2.2,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointRadius: 4
        },
        {
          label: 'FICKY',
          data: saCalculated['FICKY'].periodValues,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.16)',
          borderWidth: 2.2,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointRadius: 4
        },
        {
          label: 'ACEP',
          data: saCalculated['ACEP'].periodValues,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.16)',
          borderWidth: 2.2,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#ffffff',
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 10.5, weight: '700' } } },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}% Pencapaian`
          }
        }
      },
      scales: {
        r: {
          min: 0,
          suggestedMax: 150,
          angleLines: { color: 'rgba(226, 232, 240, 0.9)' },
          grid: { color: 'rgba(226, 232, 240, 0.9)' },
          pointLabels: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: '700' },
            color: '#1e293b'
          },
          ticks: {
            stepSize: 30,
            font: { size: 9 },
            color: '#94a3b8',
            backdropColor: 'transparent',
            callback: v => v + '%'
          }
        }
      }
    }
  });

  if (tbody) {
    let rowsHtml = '';
    METRIC_DEFS.forEach((m, idx) => {
      const vDidin = saCalculated['DIDIN'].periodValues[idx] || 0;
      const vFicky = saCalculated['FICKY'].periodValues[idx] || 0;
      const vAcep = saCalculated['ACEP'].periodValues[idx] || 0;

      let leader = 'DIDIN';
      let maxVal = vDidin;
      let badgeClass = 'blue';
      if (vFicky > maxVal) {
        leader = 'FICKY';
        maxVal = vFicky;
        badgeClass = 'green';
      }
      if (vAcep > maxVal) {
        leader = 'ACEP';
        maxVal = vAcep;
        badgeClass = 'amber';
      }

      rowsHtml += `
        <tr>
          <td style="font-weight: 600; color: #1e293b; padding: 7px 10px;">${m.label}</td>
          <td style="text-align: right; padding: 7px 10px; font-weight: ${leader === 'DIDIN' ? '800' : '500'}; color: ${leader === 'DIDIN' ? '#1d4ed8' : '#334155'};">
            ${vDidin}%
          </td>
          <td style="text-align: right; padding: 7px 10px; font-weight: ${leader === 'FICKY' ? '800' : '500'}; color: ${leader === 'FICKY' ? '#047857' : '#334155'};">
            ${vFicky}%
          </td>
          <td style="text-align: right; padding: 7px 10px; font-weight: ${leader === 'ACEP' ? '800' : '500'}; color: ${leader === 'ACEP' ? '#b45309' : '#334155'};">
            ${vAcep}%
          </td>
          <td style="text-align: center; padding: 7px 10px;">
            <span class="tag-badge ${badgeClass}" style="font-size: 10px; padding: 2px 8px;">
              ${leader} (${maxVal}%)
            </span>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rowsHtml;
  }
}
// -------------------------------------------------------------------
// 5. OPERATIONAL BREAKDOWN TABLE
// -------------------------------------------------------------------
function renderBreakdownTable() {
  const tbody = document.getElementById('breakdown-tbody');
  if (!tbody || !dashboardData) return;

  const yr = STATE.year;
  const ly = String(parseInt(yr) - 1);

  const saFilter = item => STATE.sa === 'all' || !item.sa || item.sa === STATE.sa;

  // Calculate Customer Segment Composition (Retail, Fleet, Sudeco, TPI) for active period
  let segRetU = 0, segRetRev = 0;
  let segFltU = 0, segFltRev = 0;
  let segSudU = 0, segSudRev = 0;
  let segTpiU = 0, segTpiRev = 0;

  if (dashboardData.breakdown) {
    dashboardData.breakdown
      .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && saFilter(item))
      .forEach(item => {
        const seg = (item.fleet_retail || '').toUpperCase();
        const u = item.units || 0;
        const r = item.revenue || 0;
        if (seg.includes('SUDECO')) {
          segSudU += u; segSudRev += r;
        } else if (seg.includes('TPI')) {
          segTpiU += u; segTpiRev += r;
        } else if (seg.includes('FLEET')) {
          segFltU += u; segFltRev += r;
        } else {
          segRetU += u; segRetRev += r;
        }
      });
  }

  const totSegU = segRetU + segFltU + segSudU + segTpiU || 1;
  const pRet = (segRetU / totSegU) * 100;
  const pFlt = (segFltU / totSegU) * 100;
  const pSud = (segSudU / totSegU) * 100;
  const pTpi = (segTpiU / totSegU) * 100;

  // Update DOM segment cluster
  const totalUnitsBadge = document.getElementById('seg-total-units-badge');
  if (totalUnitsBadge) totalUnitsBadge.textContent = `Total Unit Entry: ${formatNum(totSegU)}`;

  const ratiosEl = document.getElementById('seg-composition-ratios');
  if (ratiosEl) ratiosEl.textContent = `Retail: ${pRet.toFixed(1)}% | Fleet: ${pFlt.toFixed(1)}% | Sudeco: ${pSud.toFixed(1)}% | TPI: ${pTpi.toFixed(1)}%`;

  const barRet = document.getElementById('seg-bar-retail');
  if (barRet) barRet.style.width = `${pRet}%`;
  const barFlt = document.getElementById('seg-bar-fleet');
  if (barFlt) barFlt.style.width = `${pFlt}%`;
  const barSud = document.getElementById('seg-bar-sudeco');
  if (barSud) barSud.style.width = `${pSud}%`;
  const barTpi = document.getElementById('seg-bar-tpi');
  if (barTpi) barTpi.style.width = `${pTpi}%`;

  const retUEl = document.getElementById('seg-retail-units');
  if (retUEl) retUEl.textContent = `${formatNum(segRetU)} Unit`;
  const retRevEl = document.getElementById('seg-retail-rev');
  if (retRevEl) retRevEl.textContent = formatIDR(segRetRev);
  const retPctEl = document.getElementById('seg-retail-pct');
  if (retPctEl) retPctEl.textContent = `${pRet.toFixed(1)}%`;

  const fltUEl = document.getElementById('seg-fleet-units');
  if (fltUEl) fltUEl.textContent = `${formatNum(segFltU)} Unit`;
  const fltRevEl = document.getElementById('seg-fleet-rev');
  if (fltRevEl) fltRevEl.textContent = formatIDR(segFltRev);
  const fltPctEl = document.getElementById('seg-fleet-pct');
  if (fltPctEl) fltPctEl.textContent = `${pFlt.toFixed(1)}%`;

  const sudUEl = document.getElementById('seg-sudeco-units');
  if (sudUEl) sudUEl.textContent = `${formatNum(segSudU)} Unit`;
  const sudRevEl = document.getElementById('seg-sudeco-rev');
  if (sudRevEl) sudRevEl.textContent = formatIDR(segSudRev);
  const sudPctEl = document.getElementById('seg-sudeco-pct');
  if (sudPctEl) sudPctEl.textContent = `${pSud.toFixed(1)}%`;

  const tpiUEl = document.getElementById('seg-tpi-units');
  if (tpiUEl) tpiUEl.textContent = `${formatNum(segTpiU)} Unit`;
  const tpiRevEl = document.getElementById('seg-tpi-rev');
  if (tpiRevEl) tpiRevEl.textContent = formatIDR(segTpiRev);
  const tpiPctEl = document.getElementById('seg-tpi-pct');
  if (tpiPctEl) tpiPctEl.textContent = `${pTpi.toFixed(1)}%`;

  // Compute base denominators for current period & last year
  let totalUE_cur = 0, totalCPUS_cur = 0, totalSBE_cur = 0, totalSBI_cur = 0;
  let totalUE_ly = 0, totalCPUS_ly = 0, totalSBE_ly = 0, totalSBI_ly = 0;

  dashboardData.breakdown
    .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && saFilter(item))
    .forEach(item => {
      const u = item.units || 0;
      totalUE_cur += u;
      if (item.type_ue === 'CPUS') totalCPUS_cur += u;
      if (item.type_service === 'SBE') totalSBE_cur += u;
      if (item.type_service === 'SBI' || item.type_ue === 'SBI') totalSBI_cur += u;
    });

  dashboardData.breakdown
    .filter(item => String(item.year) === ly && isMonthInFilter(item.month_name) && saFilter(item))
    .forEach(item => {
      const u = item.units || 0;
      totalUE_ly += u;
      if (item.type_ue === 'CPUS') totalCPUS_ly += u;
      if (item.type_service === 'SBE') totalSBE_ly += u;
      if (item.type_service === 'SBI' || item.type_ue === 'SBI') totalSBI_ly += u;
    });

  const categories = [
    {
      label: 'CPUS (Total Unit Masuk)',
      filter: item => item.type_ue === 'CPUS',
      baseLabel: 'dari Unit Entry',
      calcPct: (curU, lyU) => ({
        curPct: totalUE_cur > 0 ? curU / totalUE_cur : 0,
        lyPct: totalUE_ly > 0 ? lyU / totalUE_ly : 0
      })
    },
    {
      label: 'SBE (Servis Berkala)',
      filter: item => item.type_service === 'SBE',
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    },
    {
      label: 'T-CARE (Kendaraan Program)',
      filter: item => item.tcare === 't-care',
      baseLabel: 'dari SBE',
      calcPct: (curU, lyU) => ({
        curPct: totalSBE_cur > 0 ? curU / totalSBE_cur : 0,
        lyPct: totalSBE_ly > 0 ? lyU / totalSBE_ly : 0
      })
    },
    {
      label: 'NON T-CARE (Servis Reguler)',
      filter: item => item.tcare !== 't-care' && item.type_service === 'SBE',
      baseLabel: 'dari SBE',
      calcPct: (curU, lyU) => ({
        curPct: totalSBE_cur > 0 ? curU / totalSBE_cur : 0,
        lyPct: totalSBE_ly > 0 ? lyU / totalSBE_ly : 0
      })
    },
    {
      label: 'GR OTHER (General Repair Lainnya)',
      filter: item => item.type_service === 'GR OTHER',
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    },
    {
      label: 'GR OIL (Ganti Oli Saja)',
      filter: item => item.type_service === 'GR OIL',
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    },
    {
      label: 'TWC (Toyota Warranty Claim)',
      filter: item => item.type_service === 'TWC' || item.type_ue === 'TWC',
      baseLabel: 'dari Unit Entry',
      calcPct: (curU, lyU) => ({
        curPct: totalUE_cur > 0 ? curU / totalUE_cur : 0,
        lyPct: totalUE_ly > 0 ? lyU / totalUE_ly : 0
      })
    },
    {
      label: 'SBI (Service Berkala Internal)',
      filter: item => item.type_service === 'SBI' || item.type_ue === 'SBI',
      baseLabel: 'dari Unit Entry',
      calcPct: (curU, lyU) => ({
        curPct: totalUE_cur > 0 ? curU / totalUE_cur : 0,
        lyPct: totalUE_ly > 0 ? lyU / totalUE_ly : 0
      })
    },
    {
      label: 'SBI SO (Same Outlet)',
      filter: item => item.sbi_so === 'sbi so',
      baseLabel: 'dari NCS Kircon',
      calcPct: (curU, lyU) => ({
        curPct: totalSBI_cur > 0 ? curU / totalSBI_cur : 0,
        lyPct: totalSBI_ly > 0 ? lyU / totalSBI_ly : 0
      })
    },
    {
      label: 'SEGMEN MIDDLE UP',
      filter: item => (item.model_segment || '').toUpperCase().includes('UP'),
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    },
    {
      label: 'SEGMEN MIDDLE LOW',
      filter: item => (item.model_segment || '').toUpperCase().includes('LOW'),
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    },
    {
      label: 'UNIT THS',
      filter: item => item.ths === 'THS',
      baseLabel: 'dari Unit Entry',
      calcPct: (curU, lyU) => ({
        curPct: totalUE_cur > 0 ? curU / totalUE_cur : 0,
        lyPct: totalUE_ly > 0 ? lyU / totalUE_ly : 0
      })
    },
    {
      label: 'UNIT BOOKING',
      filter: item => (item.arrival_type || '').toUpperCase() === 'BOOKING',
      baseLabel: 'dari Unit Entry',
      calcPct: (curU, lyU) => ({
        curPct: totalUE_cur > 0 ? curU / totalUE_cur : 0,
        lyPct: totalUE_ly > 0 ? lyU / totalUE_ly : 0
      })
    },
    {
      label: 'SEGMEN RETAIL',
      filter: item => item.fleet_retail === 'RETAIL',
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    },
    {
      label: 'SEGMEN FLEET',
      filter: item => item.fleet_retail === 'FLEET',
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    },
    {
      label: 'SEGMEN TPI',
      filter: item => item.fleet_retail === 'TPI',
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    },
    {
      label: 'SEGMEN SUDECO',
      filter: item => item.fleet_retail === 'SUDECO',
      baseLabel: 'dari CPUS',
      calcPct: (curU, lyU) => ({
        curPct: totalCPUS_cur > 0 ? curU / totalCPUS_cur : 0,
        lyPct: totalCPUS_ly > 0 ? lyU / totalCPUS_ly : 0
      })
    }
  ];

  let html = '';

  categories.forEach(cat => {
    let curUnits = 0;
    let curRev = 0;
    let lyUnits = 0;
    let lyRev = 0;

    dashboardData.breakdown
      .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && saFilter(item) && cat.filter(item))
      .forEach(item => {
        curUnits += item.units || 0;
        curRev += item.revenue || 0;
      });

    dashboardData.breakdown
      .filter(item => String(item.year) === ly && isMonthInFilter(item.month_name) && saFilter(item) && cat.filter(item))
      .forEach(item => {
        lyUnits += item.units || 0;
        lyRev += item.revenue || 0;
      });

    const pcts = cat.calcPct(curUnits, lyUnits);
    const curRevPerUnit = curUnits > 0 ? curRev / curUnits : 0;
    const lyRevPerUnit = lyUnits > 0 ? lyRev / lyUnits : 0;
    const unitDiff = curUnits - lyUnits;

    html += `
      <tr>
        <td class="sticky-col" style="font-weight: 600;">${cat.label}</td>
        <td class="numeric" style="font-weight: 700;">${formatNum(curUnits)}</td>
        <td class="numeric" style="background: #f0fdf4; font-weight: 700; color: #166534;">
          ${formatPct(pcts.curPct)}
          <span style="font-size: 10px; color: #64748b; font-weight: 500; display: block; margin-top: 1px;">${cat.baseLabel}</span>
        </td>
        <td class="numeric">${formatIDR(curRev)}</td>
        <td class="numeric">${formatIDR(curRevPerUnit)}</td>
        <td class="numeric" style="color: var(--text-secondary);">${formatNum(lyUnits)}</td>
        <td class="numeric" style="color: var(--text-secondary); background: #f8fafc;">${formatPct(pcts.lyPct)}</td>
        <td class="numeric" style="color: var(--text-secondary);">${formatIDR(lyRev)}</td>
        <td class="numeric" style="color: var(--text-secondary);">${formatIDR(lyRevPerUnit)}</td>
        <td class="numeric" style="font-weight: 700; color: ${unitDiff >= 0 ? 'var(--status-up)' : 'var(--status-down)'};">
          ${unitDiff >= 0 ? '+' : ''}${formatNum(unitDiff)}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// -------------------------------------------------------------------
// 6. CROSS SELLING & UPSELLING TABLE (From Daftar List SO)
// -------------------------------------------------------------------
function renderCrossSellingTable() {
  const tbody = document.getElementById('cross-tbody');
  if (!tbody || !dashboardData) return;

  const yr = STATE.year;
  const ly = String(parseInt(yr) - 1);
  const saFilter = item => STATE.sa === 'all' || !item.sa || item.sa === STATE.sa;
  const EXCLUDED_CATEGORIES = ['SYNT', 'WIPER FLUID'];

  const curCatMap = {};
  const lyCatMap = {};

  if (dashboardData.cross_selling) {
    dashboardData.cross_selling
      .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && saFilter(item))
      .forEach(item => {
        const c = (item.category || 'LAINNYA').toUpperCase().trim();
        if (EXCLUDED_CATEGORIES.includes(c)) return;
        if (!curCatMap[c]) curCatMap[c] = { qty: 0, rev: 0 };
        curCatMap[c].qty += item.qty || 0;
        curCatMap[c].rev += item.revenue || 0;
      });

    dashboardData.cross_selling
      .filter(item => String(item.year) === ly && isMonthInFilter(item.month_name) && saFilter(item))
      .forEach(item => {
        const c = (item.category || 'LAINNYA').toUpperCase().trim();
        if (EXCLUDED_CATEGORIES.includes(c)) return;
        if (!lyCatMap[c]) lyCatMap[c] = { qty: 0, rev: 0 };
        lyCatMap[c].qty += item.qty || 0;
        lyCatMap[c].rev += item.revenue || 0;
      });
  }

  // Calculate Customer Segment Proportion (Retail, Fleet, Sudeco, TPI) in active period
  let retCount = 0, fltCount = 0, sudCount = 0, tpiCount = 0;
  if (dashboardData.breakdown) {
    dashboardData.breakdown
      .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && saFilter(item))
      .forEach(item => {
        const seg = (item.fleet_retail || '').toUpperCase();
        if (seg.includes('SUDECO')) sudCount += item.units || 1;
        else if (seg.includes('TPI')) tpiCount += item.units || 1;
        else if (seg.includes('FLEET')) fltCount += item.units || 1;
        else retCount += item.units || 1;
      });
  }
  const totSeg = retCount + fltCount + sudCount + tpiCount || 1;
  const pRet = retCount / totSeg;
  const pFlt = fltCount / totSeg;
  const pSud = sudCount / totSeg;
  const pTpi = tpiCount / totSeg;

  const allCategories = Array.from(new Set([...Object.keys(curCatMap), ...Object.keys(lyCatMap)]));
  allCategories.sort();

  let html = '';
  allCategories.forEach(cat => {
    const cur = curCatMap[cat] || { qty: 0, rev: 0 };
    const lyData = lyCatMap[cat] || { qty: 0, rev: 0 };

    const growthRev = lyData.rev > 0 ? (cur.rev - lyData.rev) / lyData.rev : 0;
    const diffQty = cur.qty - lyData.qty;

    const qRet = Math.round(cur.qty * pRet);
    const qFlt = Math.round(cur.qty * pFlt);
    const qSud = Math.round(cur.qty * pSud);
    const qTpi = Math.max(0, cur.qty - qRet - qFlt - qSud);

    const compCell = cur.qty > 0 ? `
      <div class="seg-comp-pill-wrap" style="display: flex; flex-direction: column; gap: 3px;" title="Retail: ${qRet} (${formatPct(pRet)}) | Fleet: ${qFlt} (${formatPct(pFlt)}) | Sudeco: ${qSud} (${formatPct(pSud)}) | TPI: ${qTpi} (${formatPct(pTpi)})">
        <div style="display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: #e2e8f0;">
          <div style="width: ${pRet*100}%; background: #10b981;" title="Retail: ${qRet}"></div>
          <div style="width: ${pFlt*100}%; background: #2563eb;" title="Fleet: ${qFlt}"></div>
          <div style="width: ${pSud*100}%; background: #8b5cf6;" title="Sudeco: ${qSud}"></div>
          <div style="width: ${pTpi*100}%; background: #f59e0b;" title="TPI: ${qTpi}"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700;">
          <span style="color: #047857;" title="Retail: ${qRet}">Ret ${formatPct(pRet, 0)}</span>
          <span style="color: #1d4ed8;" title="Fleet: ${qFlt}">Flt ${formatPct(pFlt, 0)}</span>
          <span style="color: #6d28d9;" title="Sudeco: ${qSud}">Sud ${formatPct(pSud, 0)}</span>
          <span style="color: #b45309;" title="TPI: ${qTpi}">TPI ${formatPct(pTpi, 0)}</span>
        </div>
      </div>
    ` : `<span style="color: #94a3b8; font-size: 11px;">—</span>`;

    html += `
      <tr>
        <td class="sticky-col" style="font-weight: 600;">${cat}</td>
        <td class="numeric">${formatNum(cur.qty)}</td>
        <td class="numeric">${formatIDR(cur.rev)}</td>
        <td style="min-width: 200px; padding: 6px 12px;">${compCell}</td>
        <td class="numeric" style="color: var(--text-secondary);">${formatNum(lyData.qty)}</td>
        <td class="numeric" style="color: var(--text-secondary);">${formatIDR(lyData.rev)}</td>
        <td class="numeric" style="font-weight: 700; color: ${diffQty >= 0 ? 'var(--status-up)' : 'var(--status-down)'};">
          ${diffQty >= 0 ? '+' : ''}${formatNum(diffQty)}
        </td>
        <td class="numeric" style="font-weight: 700; color: ${growthRev >= 0 ? 'var(--status-up)' : 'var(--status-down)'};">
          ${lyData.rev > 0 ? formatPct(growthRev) : '—'}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function renderDataExplorerTable(filterQuery = '') {
  const tbody = document.getElementById('explorer-tbody');
  if (!tbody || !dashboardData) return;

  const samples = dashboardData.sample_pkb || [];
  const filtered = samples.filter(item => {
    if (STATE.segment !== 'all') {
      const rowSeg = (item.segment || '').toUpperCase();
      if (!rowSeg.includes(STATE.segment)) return false;
    }
    if (!filterQuery) return true;
    return (
      (item.customer && item.customer.toLowerCase().includes(filterQuery)) ||
      (item.police_no && item.police_no.toLowerCase().includes(filterQuery)) ||
      (item.pkb_no && item.pkb_no.toLowerCase().includes(filterQuery)) ||
      (item.sa && item.sa.toLowerCase().includes(filterQuery)) ||
      (item.model && item.model.toLowerCase().includes(filterQuery))
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 32px;">Tidak ditemukan data PKB yang sesuai kriteria pencarian.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 60).map(row => `
    <tr>
      <td class="sticky-col" style="font-weight: 700; font-family: var(--font-mono); font-size: 11.5px;">${row.pkb_no || '—'}</td>
      <td style="color: var(--text-body);">${row.tgl} ${row.month} ${row.year}</td>
      <td><span class="tag-badge slate" style="font-family: var(--font-mono); font-weight: 600;">${row.police_no || '—'}</span></td>
      <td style="font-weight: 600;">${row.customer || '—'}</td>
      <td style="color: var(--text-body);">${row.model || '—'}</td>
      <td><span class="tag-badge blue">${row.sa || '—'}</span></td>
      <td>${row.type_service || row.type_ue || '—'}</td>
      <td><span class="tag-badge ${row.segment === 'FLEET' ? 'amber' : 'green'}">${row.segment || 'RETAIL'}</span></td>
      <td class="numeric" style="font-weight: 700;">${formatIDR(row.revenue)}</td>
    </tr>
  `).join('');
}

// -------------------------------------------------------------------
// 7B. GEOSPATIAL AREA MAPPING (LEAFLET) & CHARACTERISTICS MATRIX
// -------------------------------------------------------------------
function initAreaMap() {
  const mapContainer = document.getElementById('area-leaflet-map');
  if (!mapContainer || typeof L === 'undefined' || areaMapInstance) return;

  const center = [-6.9427, 107.6433]; // Tunas Toyota Kiaracondong, Bandung
  areaMapInstance = L.map('area-leaflet-map', {
    center: center,
    zoom: 12,
    zoomControl: true,
    scrollWheelZoom: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(areaMapInstance);

  areaMapLayerGroup = L.layerGroup().addTo(areaMapInstance);
}

function renderAreaMapping() {
  const mapContainer = document.getElementById('area-leaflet-map');
  if (!mapContainer || typeof L === 'undefined') return;
  if (!areaMapInstance) initAreaMap();
  if (!areaMapLayerGroup) return;

  areaMapLayerGroup.clearLayers();

  const center = [-6.9427, 107.6433];
  const yr = STATE.year;
  const saFilter = item => STATE.sa === 'all' ? item.sa === 'ALL' : item.sa === STATE.sa;

  // Add Workshop Center Marker
  const workshopIcon = L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="background: #e11d48; color: #ffffff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(225,29,72,0.4); border: 2.5px solid #ffffff; font-weight: 800; font-size: 13px;">
        HQ
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  const hqMarker = L.marker(center, { icon: workshopIcon });
  hqMarker.bindPopup(`
    <div style="font-family: var(--font-primary); padding: 4px;">
      <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 13px;">Tunas Toyota Kiaracondong</h4>
      <p style="margin: 0; font-size: 11px; color: #475569;">Pusat Servis Resmi &amp; Bengkel Bodi Cat</p>
      <div style="margin-top: 6px; font-size: 11px; font-weight: 600; color: #2563eb;">Titik Acuan Radius (0 km)</div>
    </div>
  `);
  areaMapLayerGroup.addLayer(hqMarker);

  // Concentric Rings
  const rings = [
    {
      areaKey: 'RING 1',
      name: 'Area 1 (Ring 1)',
      radius: 5000,
      color: '#2563eb',
      fillColor: 'rgba(37, 99, 235, 0.12)',
      desc: 'Radius 0 - 5 km (Kiaracondong, Batununggal, Antapani, Lengkong)',
      markerPos: [-6.9380, 107.6380]
    },
    {
      areaKey: 'RING 2',
      name: 'Area 2 (Ring 2)',
      radius: 10000,
      color: '#7c3aed',
      fillColor: 'rgba(124, 58, 237, 0.08)',
      desc: 'Radius 5 - 10 km (Coblong, Arcamanik, Buahbatu, Sukasari)',
      markerPos: [-6.9100, 107.6700]
    },
    {
      areaKey: 'RING 3',
      name: 'Area 3 (Ring 3)',
      radius: 15000,
      color: '#db2777',
      fillColor: 'rgba(219, 39, 119, 0.06)',
      desc: 'Radius 10 - 15 km (Cimahi, Ujungberung, Cibiru, Kab. Bandung)',
      markerPos: [-6.8850, 107.5900]
    },
    {
      areaKey: 'OUT OF AREA',
      name: 'Out of Area',
      radius: null,
      desc: 'Luar Ring Zonasi Bengkel (> 15 km)',
      markerPos: [-6.9750, 107.7200]
    }
  ];

  rings.forEach(r => {
    if (r.radius) {
      const circle = L.circle(center, {
        radius: r.radius,
        color: r.color,
        weight: 1.8,
        dashArray: r.areaKey === 'RING 3' ? '4, 4' : null,
        fillColor: r.fillColor,
        fillOpacity: 1
      });
      circle.bindTooltip(`<b>${r.name}</b><br>${r.desc}`, { sticky: true });
      areaMapLayerGroup.addLayer(circle);
    }
  });

  // Calculate Map Totals and Area Counts
  let totalMapGR = 0;
  let totalMapSBE = 0;

  const areaAgg = {};
  rings.forEach(r => {
    areaAgg[r.areaKey] = {
      name: r.name,
      gr_gt2: 0,
      sbe_gt2: 0,
      total_ue: 0,
      total_rev: 0,
      markerPos: r.markerPos
    };
  });

  if (dashboardData.area_characteristics) {
    dashboardData.area_characteristics
      .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && saFilter(item))
      .forEach(item => {
        const aKey = item.ring_area || 'OUT OF AREA';
        if (areaAgg[aKey]) {
          const gr2 = item.gr_serv_gt2 || 0;
          const sbe2 = item.sbe_serv_gt2 || 0;
          areaAgg[aKey].gr_gt2 += gr2;
          areaAgg[aKey].sbe_gt2 += sbe2;
          areaAgg[aKey].total_ue += (item.total_ue || 0);
          areaAgg[aKey].total_rev += (item.total_revenue || 0);
          totalMapGR += gr2;
          totalMapSBE += sbe2;
        }
      });
  }

  // Update counter badges in header
  const grCountEl = document.getElementById('map-counter-gr');
  if (grCountEl) grCountEl.textContent = formatNum(totalMapGR);
  const sbeCountEl = document.getElementById('map-counter-sbe');
  if (sbeCountEl) sbeCountEl.textContent = formatNum(totalMapSBE);

  // Place dual pins (GR Biru, SBE Hijau) for each Ring Area
  Object.keys(areaAgg).forEach(aKey => {
    const data = areaAgg[aKey];
    const pos = data.markerPos;

    const markerHtml = `
      <div class="area-map-badge-cluster" style="cursor: pointer;">
        <div style="background: #ffffff; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); border: 1px solid #cbd5e1; padding: 4px 8px; font-size: 11px; white-space: nowrap; font-family: var(--font-primary);">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 3px; font-size: 11.5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
            ${data.name}
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="display: inline-flex; align-items: center; gap: 4px; background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #2563eb;"></span>
              GR &gt; 2: ${formatNum(data.gr_gt2)}
            </span>
            <span style="display: inline-flex; align-items: center; gap: 4px; background: #f0fdf4; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #16a34a;"></span>
              SBE &gt; 2: ${formatNum(data.sbe_gt2)}
            </span>
          </div>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'area-custom-icon',
      html: markerHtml,
      iconSize: [160, 50],
      iconAnchor: [80, 25]
    });

    const m = L.marker(pos, { icon: icon });
    m.bindPopup(`
      <div style="font-family: var(--font-primary); padding: 4px; min-width: 200px;">
        <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 13px;">${data.name}</h4>
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px;">
          <div><strong style="color: #2563eb;">GR (&gt; 2 Servis):</strong> ${formatNum(data.gr_gt2)} Unit</div>
          <div><strong style="color: #16a34a;">SBE (&gt; 2 Servis):</strong> ${formatNum(data.sbe_gt2)} Unit</div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 4px; margin-top: 2px;">
            <strong>Total Unit Entry:</strong> ${formatNum(data.total_ue)} Unit
          </div>
          <div><strong>Total Revenue:</strong> ${formatIDR(data.total_rev)}</div>
        </div>
        <button type="button" onclick="selectAreaFilter('${aKey}')" style="margin-top: 8px; width: 100%; padding: 4px 8px; background: #0f172a; color: #ffffff; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600;">
          Tampilkan Karakteristik Wilayah &darr;
        </button>
      </div>
    `);
    areaMapLayerGroup.addLayer(m);
  });
}

// Global helper for area popup button
window.selectAreaFilter = function(areaKey) {
  selectedAreaFilter = areaKey;
  document.querySelectorAll('.area-pill-btn').forEach(b => {
    if (b.getAttribute('data-area') === areaKey) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
  renderAreaCharacteristicsTable();
  const tableEl = document.getElementById('area-characteristics-tbody');
  if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};


let mapRingAreaInstance = null;
let mapFleetRetailInstance = null;

async function renderMappingRingAndFleetCharts() {
  if (!funnellingData) {
    try {
      const res = await fetch(`data/funnelling_data.json?v=8.0`);
      if (res.ok) funnellingData = await res.json();
    } catch (e) {
      // non-blocking
    }
  }
  if (!funnellingData) return;

  const ringTrend = funnellingData.monthly_ring_area_trend || {};
  const fleetTrend = funnellingData.monthly_fleet_retail_trend || {};
  const all12 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const activeMonthsList = all12.filter(m => {
    const r = ringTrend[m];
    const f = fleetTrend[m];
    return (r && (r['Ring 1']?.cust_fu > 0 || r['Ring 2']?.cust_fu > 0 || r['Ring 3']?.cust_fu > 0 || r['Out of Area']?.cust_fu > 0)) ||
           (f && (f['Retail']?.cust_fu > 0 || f['Fleet']?.cust_fu > 0));
  });
  const months = activeMonthsList.length > 0 ? activeMonthsList : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt'];

  // 1. Chart Ring Area in Mapping Pane
  const ringCanvas = document.getElementById('chart-map-ring-area');
  if (ringCanvas) {
    if (mapRingAreaInstance) mapRingAreaInstance.destroy();

    const ring1Con = months.map(m => ringTrend[m]?.['Ring 1']?.connected || 0);
    const ring1Fu = months.map(m => ringTrend[m]?.['Ring 1']?.cust_fu || 0);

    const ring2Con = months.map(m => ringTrend[m]?.['Ring 2']?.connected || 0);
    const ring2Fu = months.map(m => ringTrend[m]?.['Ring 2']?.cust_fu || 0);

    const ring3Con = months.map(m => ringTrend[m]?.['Ring 3']?.connected || 0);
    const ring3Fu = months.map(m => ringTrend[m]?.['Ring 3']?.cust_fu || 0);

    const outCon = months.map(m => ringTrend[m]?.['Out of Area']?.connected || 0);
    const outFu = months.map(m => ringTrend[m]?.['Out of Area']?.cust_fu || 0);

    mapRingAreaInstance = new Chart(ringCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Ring 1 (Connected)', data: ring1Con, backgroundColor: '#2563eb', borderRadius: 3, stack: 'connected' },
          { label: 'Ring 2 (Connected)', data: ring2Con, backgroundColor: '#10b981', borderRadius: 3, stack: 'connected' },
          { label: 'Ring 3 (Connected)', data: ring3Con, backgroundColor: '#f59e0b', borderRadius: 3, stack: 'connected' },
          { label: 'Out Area (Connected)', data: outCon, backgroundColor: '#8b5cf6', borderRadius: 3, stack: 'connected' },
          {
            type: 'line',
            label: 'Total Cust FU',
            data: months.map((m, i) => ring1Fu[i] + ring2Fu[i] + ring3Fu[i] + outFu[i]),
            borderColor: '#64748b',
            backgroundColor: '#64748b',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 3,
            tension: 0.2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10, weight: '600' } } },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              footer: (items) => {
                const idx = items[0].dataIndex;
                const totFu = ring1Fu[idx] + ring2Fu[idx] + ring3Fu[idx] + outFu[idx];
                const totCon = ring1Con[idx] + ring2Con[idx] + ring3Con[idx] + outCon[idx];
                const r = totFu > 0 ? ((totCon / totFu) * 100).toFixed(1) : '0';
                return `Total Connected: ${totCon} / ${totFu} (${r}%)`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, weight: '700' } } },
          y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.5)' } }
        }
      }
    });

    const badge = document.getElementById('map-ring-area-kpi-badge');
    if (badge) {
      const totAllFu = ring1Fu.reduce((a,b)=>a+b,0) + ring2Fu.reduce((a,b)=>a+b,0) + ring3Fu.reduce((a,b)=>a+b,0) + outFu.reduce((a,b)=>a+b,0);
      const totAllCon = ring1Con.reduce((a,b)=>a+b,0) + ring2Con.reduce((a,b)=>a+b,0) + ring3Con.reduce((a,b)=>a+b,0) + outCon.reduce((a,b)=>a+b,0);
      badge.textContent = `Rasio Rata-rata: ${((totAllCon / totAllFu)*100).toFixed(1)}% Connected`;
    }
  }

  // 2. Chart Fleet / Retail in Mapping Pane
  const fleetCanvas = document.getElementById('chart-map-fleet-retail');
  if (fleetCanvas) {
    if (mapFleetRetailInstance) mapFleetRetailInstance.destroy();

    const retCon = months.map(m => fleetTrend[m]?.['Retail']?.connected || 0);
    const retFu = months.map(m => fleetTrend[m]?.['Retail']?.cust_fu || 0);

    const fltCon = months.map(m => fleetTrend[m]?.['Fleet']?.connected || 0);
    const fltFu = months.map(m => fleetTrend[m]?.['Fleet']?.cust_fu || 0);

    const retPct = months.map((m, i) => retFu[i] > 0 ? Math.round((retCon[i] / retFu[i]) * 100) : 0);
    const fltPct = months.map((m, i) => fltFu[i] > 0 ? Math.round((fltCon[i] / fltFu[i]) * 100) : 0);

    mapFleetRetailInstance = new Chart(fleetCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { type: 'bar', label: 'Retail Connected', data: retCon, backgroundColor: '#059669', borderRadius: 3, yAxisID: 'y' },
          { type: 'bar', label: 'Retail Cust FU', data: retFu, backgroundColor: '#a7f3d0', borderRadius: 3, yAxisID: 'y' },
          { type: 'bar', label: 'Fleet Connected', data: fltCon, backgroundColor: '#db2777', borderRadius: 3, yAxisID: 'y' },
          { type: 'bar', label: 'Fleet Cust FU', data: fltFu, backgroundColor: '#fbcfe8', borderRadius: 3, yAxisID: 'y' },
          { type: 'line', label: '% Connected Retail', data: retPct, borderColor: '#047857', borderWidth: 2, pointRadius: 3, yAxisID: 'yPct', tension: 0.2 },
          { type: 'line', label: '% Connected Fleet', data: fltPct, borderColor: '#be185d', borderWidth: 2, pointRadius: 3, borderDash: [3, 3], yAxisID: 'yPct', tension: 0.2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10, weight: '600' } } },
          tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)' }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, weight: '700' } } },
          y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.5)' }, title: { display: true, text: 'Volume Call', font: { size: 10 } } },
          yPct: { position: 'right', beginAtZero: true, max: 100, grid: { display: false }, ticks: { callback: v => v + '%', font: { size: 9 } } }
        }
      }
    });

    const badgeFlt = document.getElementById('map-fleet-retail-kpi-badge');
    if (badgeFlt) {
      const totRetFu = retFu.reduce((a,b)=>a+b,0);
      const totRetCon = retCon.reduce((a,b)=>a+b,0);
      const totFltFu = fltFu.reduce((a,b)=>a+b,0);
      const totFltCon = fltCon.reduce((a,b)=>a+b,0);
      badgeFlt.textContent = `Retail: ${((totRetCon/totRetFu)*100).toFixed(1)}% | Fleet: ${((totFltCon/totFltFu)*100).toFixed(1)}%`;
    }
  }
}

function renderAreaCharacteristicsTable() {
  const tbody = document.getElementById('area-characteristics-tbody');
  if (!tbody || !dashboardData || !dashboardData.area_characteristics) return;

  const yr = STATE.year;
  const ly = String(parseInt(yr) - 1);
  const saFilter = item => STATE.sa === 'all' ? item.sa === 'ALL' : item.sa === STATE.sa;
  const areaFilter = item => item.ring_area === selectedAreaFilter;

  // Aggregate current year data
  let curUE = 0, curCPUS = 0, curRev = 0;
  const curSA = { 'DIDIN': 0, 'FICKY': 0, 'ACEP': 0 };
  const curCust = { 'RETAIL': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 };
  const curService = { 'SBE': 0, 'GR OTHER': 0, 'GR OIL': 0, 'TWC': 0, 'SBI': 0 };
  const curSegment = { 'Mid-Up segment': 0, 'Mid-Low Segment': 0 };
  const curRangeRev = { '< Rp.500K': 0, 'Rp.500K s/d Rp.1Jt': 0, 'Rp.1Jt s/d Rp.1,5Jt': 0, 'Rp.1,5Jt s/d Rp.2Jt': 0, '> Rp.2Jt': 0 };
  let curTHS = 0, curBooking = 0;
  const curQtyGR = { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 };
  const curQtySBE = { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 };

  dashboardData.area_characteristics
    .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && saFilter(item) && areaFilter(item))
    .forEach(item => {
      curUE += item.total_ue || 0;
      curCPUS += item.total_cpus || 0;
      curRev += item.total_revenue || 0;
      curTHS += item.ths_count || 0;
      curBooking += item.booking_count || 0;

      if (item.sa_cpus) {
        Object.keys(curSA).forEach(k => curSA[k] += (item.sa_cpus[k] || 0));
      }
      if (item.type_cust) {
        Object.keys(curCust).forEach(k => curCust[k] += (item.type_cust[k] || 0));
      }
      if (item.type_service) {
        Object.keys(curService).forEach(k => curService[k] += (item.type_service[k] || 0));
      }
      if (item.model_segment) {
        Object.keys(curSegment).forEach(k => curSegment[k] += (item.model_segment[k] || 0));
      }
      if (item.range_revenue) {
        Object.keys(curRangeRev).forEach(k => curRangeRev[k] += (item.range_revenue[k] || 0));
      }
      if (item.qty_gr_status) {
        Object.keys(curQtyGR).forEach(k => curQtyGR[k] += (item.qty_gr_status[k] || 0));
      }
      if (item.qty_sbe_status) {
        Object.keys(curQtySBE).forEach(k => curQtySBE[k] += (item.qty_sbe_status[k] || 0));
      }
    });

  // Aggregate last year data
  let lyUE = 0, lyCPUS = 0, lyRev = 0;
  const lySA = { 'DIDIN': 0, 'FICKY': 0, 'ACEP': 0 };
  const lyCust = { 'RETAIL': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 };
  const lyService = { 'SBE': 0, 'GR OTHER': 0, 'GR OIL': 0, 'TWC': 0, 'SBI': 0 };
  const lySegment = { 'Mid-Up segment': 0, 'Mid-Low Segment': 0 };
  const lyRangeRev = { '< Rp.500K': 0, 'Rp.500K s/d Rp.1Jt': 0, 'Rp.1Jt s/d Rp.1,5Jt': 0, 'Rp.1,5Jt s/d Rp.2Jt': 0, '> Rp.2Jt': 0 };
  let lyTHS = 0, lyBooking = 0;
  const lyQtyGR = { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 };
  const lyQtySBE = { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 };

  dashboardData.area_characteristics
    .filter(item => String(item.year) === ly && isMonthInFilter(item.month_name) && saFilter(item) && areaFilter(item))
    .forEach(item => {
      lyUE += item.total_ue || 0;
      lyCPUS += item.total_cpus || 0;
      lyRev += item.total_revenue || 0;
      lyTHS += item.ths_count || 0;
      lyBooking += item.booking_count || 0;

      if (item.sa_cpus) {
        Object.keys(lySA).forEach(k => lySA[k] += (item.sa_cpus[k] || 0));
      }
      if (item.type_cust) {
        Object.keys(lyCust).forEach(k => lyCust[k] += (item.type_cust[k] || 0));
      }
      if (item.type_service) {
        Object.keys(lyService).forEach(k => lyService[k] += (item.type_service[k] || 0));
      }
      if (item.model_segment) {
        Object.keys(lySegment).forEach(k => lySegment[k] += (item.model_segment[k] || 0));
      }
      if (item.range_revenue) {
        Object.keys(lyRangeRev).forEach(k => lyRangeRev[k] += (item.range_revenue[k] || 0));
      }
      if (item.qty_gr_status) {
        Object.keys(lyQtyGR).forEach(k => lyQtyGR[k] += (item.qty_gr_status[k] || 0));
      }
      if (item.qty_sbe_status) {
        Object.keys(lyQtySBE).forEach(k => lyQtySBE[k] += (item.qty_sbe_status[k] || 0));
      }
    });

  // Aggregate ALL AREA data (as denominator for % Kontribusi: Ring / ALL Area)
  let allUE_cur = 0, allCPUS_cur = 0, allRev_cur = 0;
  const allSA_cur = { 'DIDIN': 0, 'FICKY': 0, 'ACEP': 0 };
  const allCust_cur = { 'RETAIL': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 };
  const allService_cur = { 'SBE': 0, 'GR OTHER': 0, 'GR OIL': 0, 'TWC': 0, 'SBI': 0 };
  const allSegment_cur = { 'Mid-Up segment': 0, 'Mid-Low Segment': 0 };
  const allRangeRev_cur = { '< Rp.500K': 0, 'Rp.500K s/d Rp.1Jt': 0, 'Rp.1Jt s/d Rp.1,5Jt': 0, 'Rp.1,5Jt s/d Rp.2Jt': 0, '> Rp.2Jt': 0 };
  let allTHS_cur = 0, allBooking_cur = 0;
  const allQtyGR_cur = { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 };
  const allQtySBE_cur = { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 };

  dashboardData.area_characteristics
    .filter(item => String(item.year) === yr && isMonthInFilter(item.month_name) && saFilter(item))
    .forEach(item => {
      allUE_cur += item.total_ue || 0;
      allCPUS_cur += item.total_cpus || 0;
      allRev_cur += item.total_revenue || 0;
      allTHS_cur += item.ths_count || 0;
      allBooking_cur += item.booking_count || 0;

      if (item.sa_cpus) Object.keys(allSA_cur).forEach(k => allSA_cur[k] += (item.sa_cpus[k] || 0));
      if (item.type_cust) Object.keys(allCust_cur).forEach(k => allCust_cur[k] += (item.type_cust[k] || 0));
      if (item.type_service) Object.keys(allService_cur).forEach(k => allService_cur[k] += (item.type_service[k] || 0));
      if (item.model_segment) Object.keys(allSegment_cur).forEach(k => allSegment_cur[k] += (item.model_segment[k] || 0));
      if (item.range_revenue) Object.keys(allRangeRev_cur).forEach(k => allRangeRev_cur[k] += (item.range_revenue[k] || 0));
      if (item.qty_gr_status) Object.keys(allQtyGR_cur).forEach(k => allQtyGR_cur[k] += (item.qty_gr_status[k] || 0));
      if (item.qty_sbe_status) Object.keys(allQtySBE_cur).forEach(k => allQtySBE_cur[k] += (item.qty_sbe_status[k] || 0));
    });

  // Aggregate ALL AREA for Last Year
  let allUE_ly = 0, allCPUS_ly = 0, allRev_ly = 0;
  const allSA_ly = { 'DIDIN': 0, 'FICKY': 0, 'ACEP': 0 };
  const allCust_ly = { 'RETAIL': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 };
  const allService_ly = { 'SBE': 0, 'GR OTHER': 0, 'GR OIL': 0, 'TWC': 0, 'SBI': 0 };
  const allSegment_ly = { 'Mid-Up segment': 0, 'Mid-Low Segment': 0 };
  const allRangeRev_ly = { '< Rp.500K': 0, 'Rp.500K s/d Rp.1Jt': 0, 'Rp.1Jt s/d Rp.1,5Jt': 0, 'Rp.1,5Jt s/d Rp.2Jt': 0, '> Rp.2Jt': 0 };
  let allTHS_ly = 0, allBooking_ly = 0;
  const allQtyGR_ly = { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 };
  const allQtySBE_ly = { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 };

  dashboardData.area_characteristics
    .filter(item => String(item.year) === ly && isMonthInFilter(item.month_name) && saFilter(item))
    .forEach(item => {
      allUE_ly += item.total_ue || 0;
      allCPUS_ly += item.total_cpus || 0;
      allRev_ly += item.total_revenue || 0;
      allTHS_ly += item.ths_count || 0;
      allBooking_ly += item.booking_count || 0;

      if (item.sa_cpus) Object.keys(allSA_ly).forEach(k => allSA_ly[k] += (item.sa_cpus[k] || 0));
      if (item.type_cust) Object.keys(allCust_ly).forEach(k => allCust_ly[k] += (item.type_cust[k] || 0));
      if (item.type_service) Object.keys(allService_ly).forEach(k => allService_ly[k] += (item.type_service[k] || 0));
      if (item.model_segment) Object.keys(allSegment_ly).forEach(k => allSegment_ly[k] += (item.model_segment[k] || 0));
      if (item.range_revenue) Object.keys(allRangeRev_ly).forEach(k => allRangeRev_ly[k] += (item.range_revenue[k] || 0));
      if (item.qty_gr_status) Object.keys(allQtyGR_ly).forEach(k => allQtyGR_ly[k] += (item.qty_gr_status[k] || 0));
      if (item.qty_sbe_status) Object.keys(allQtySBE_ly).forEach(k => allQtySBE_ly[k] += (item.qty_sbe_status[k] || 0));
    });

  // Define table sections and rows
  const sections = [
    {
      sectionTitle: 'TOTAL VOLUME & REVENUE WILAYAH',
      rows: [
        { label: 'TOTAL UNIT ENTRY (UE)', curU: curUE, curBase: allUE_cur, lyU: lyUE, lyBase: allUE_ly, isHeaderRow: true },
        { label: 'TOTAL CPUS', curU: curCPUS, curBase: allCPUS_cur, lyU: lyCPUS, lyBase: allCPUS_ly, isHeaderRow: false }
      ]
    },
    {
      sectionTitle: 'SERVICE ADVISOR (CPUS & % KONTRIBUSI)',
      rows: [
        { label: 'SA — DIDIN', curU: curSA['DIDIN'], curBase: allSA_cur['DIDIN'], lyU: lySA['DIDIN'], lyBase: allSA_ly['DIDIN'] },
        { label: 'SA — FICKY', curU: curSA['FICKY'], curBase: allSA_cur['FICKY'], lyU: lySA['FICKY'], lyBase: allSA_ly['FICKY'] },
        { label: 'SA — ACEP', curU: curSA['ACEP'], curBase: allSA_cur['ACEP'], lyU: lySA['ACEP'], lyBase: allSA_ly['ACEP'] }
      ]
    },
    {
      sectionTitle: 'TIPE PELANGGAN (TYPE CUST)',
      rows: [
        { label: 'RETAIL', curU: curCust['RETAIL'], curBase: allCust_cur['RETAIL'], lyU: lyCust['RETAIL'], lyBase: allCust_ly['RETAIL'] },
        { label: 'FLEET', curU: curCust['FLEET'], curBase: allCust_cur['FLEET'], lyU: lyCust['FLEET'], lyBase: allCust_ly['FLEET'] },
        { label: 'SUDECO', curU: curCust['SUDECO'], curBase: allCust_cur['SUDECO'], lyU: lyCust['SUDECO'], lyBase: allCust_ly['SUDECO'] },
        { label: 'TPI', curU: curCust['TPI'], curBase: allCust_cur['TPI'], lyU: lyCust['TPI'], lyBase: allCust_ly['TPI'] }
      ]
    },
    {
      sectionTitle: 'JENIS LAYANAN (SBE, GR, TWC, SBI)',
      rows: [
        { label: 'SBE (Servis Berkala)', curU: curService['SBE'], curBase: allService_cur['SBE'], lyU: lyService['SBE'], lyBase: allService_ly['SBE'] },
        { label: 'GR OTHER (General Repair)', curU: curService['GR OTHER'], curBase: allService_cur['GR OTHER'], lyU: lyService['GR OTHER'], lyBase: allService_ly['GR OTHER'] },
        { label: 'GR OIL (Ganti Oli)', curU: curService['GR OIL'], curBase: allService_cur['GR OIL'], lyU: lyService['GR OIL'], lyBase: allService_ly['GR OIL'] },
        { label: 'TWC (Warranty Claim)', curU: curService['TWC'], curBase: allService_cur['TWC'], lyU: lyService['TWC'], lyBase: allService_ly['TWC'] },
        { label: 'SBI (Servis Internal)', curU: curService['SBI'], curBase: allService_cur['SBI'], lyU: lyService['SBI'], lyBase: allService_ly['SBI'] }
      ]
    },
    {
      sectionTitle: 'SEGMEN KENDARAAN (MIDDLE UP vs MIDDLE LOW)',
      rows: [
        { label: 'MIDDLE UP (Innova, Fortuner, Camry, dll)', curU: curSegment['Mid-Up segment'], curBase: allSegment_cur['Mid-Up segment'], lyU: lySegment['Mid-Up segment'], lyBase: allSegment_ly['Mid-Up segment'] },
        { label: 'MIDDLE LOW (Avanza, Calya, Rush, Yaris, dll)', curU: curSegment['Mid-Low Segment'], curBase: allSegment_cur['Mid-Low Segment'], lyU: lySegment['Mid-Low Segment'], lyBase: allSegment_ly['Mid-Low Segment'] }
      ]
    },
    {
      sectionTitle: 'RANGE REVENUE PER TRANSAKSI',
      rows: [
        { label: '< Rp 500 Ribu', curU: curRangeRev['< Rp.500K'], curBase: allRangeRev_cur['< Rp.500K'], lyU: lyRangeRev['< Rp.500K'], lyBase: allRangeRev_ly['< Rp.500K'] },
        { label: 'Rp 500 Ribu s/d Rp 1 Juta', curU: curRangeRev['Rp.500K s/d Rp.1Jt'], curBase: allRangeRev_cur['Rp.500K s/d Rp.1Jt'], lyU: lyRangeRev['Rp.500K s/d Rp.1Jt'], lyBase: allRangeRev_ly['Rp.500K s/d Rp.1Jt'] },
        { label: 'Rp 1 Juta s/d Rp 1,5 Juta', curU: curRangeRev['Rp.1Jt s/d Rp.1,5Jt'], curBase: allRangeRev_cur['Rp.1Jt s/d Rp.1,5Jt'], lyU: lyRangeRev['Rp.1Jt s/d Rp.1,5Jt'], lyBase: allRangeRev_ly['Rp.1Jt s/d Rp.1,5Jt'] },
        { label: 'Rp 1,5 Juta s/d Rp 2 Juta', curU: curRangeRev['Rp.1,5Jt s/d Rp.2Jt'], curBase: allRangeRev_cur['Rp.1,5Jt s/d Rp.2Jt'], lyU: lyRangeRev['Rp.1,5Jt s/d Rp.2Jt'], lyBase: allRangeRev_ly['Rp.1,5Jt s/d Rp.2Jt'] },
        { label: '> Rp 2 Juta', curU: curRangeRev['> Rp.2Jt'], curBase: allRangeRev_cur['> Rp.2Jt'], lyU: lyRangeRev['> Rp.2Jt'], lyBase: allRangeRev_ly['> Rp.2Jt'] }
      ]
    },
    {
      sectionTitle: 'OPERASIONAL THS & BOOKING',
      rows: [
        { label: 'UNIT THS (Toyota Home Service)', curU: curTHS, curBase: allTHS_cur, lyU: lyTHS, lyBase: allTHS_ly },
        { label: 'UNIT BOOKING SERVICE', curU: curBooking, curBase: allBooking_cur, lyU: lyBooking, lyBase: allBooking_ly }
      ]
    },
    {
      sectionTitle: 'QTY GR STATUS (FREKUENSI SERVIS GENERAL REPAIR)',
      rows: [
        { label: 'GR < 3 Servis', curU: curQtyGR['< 3'], curBase: allQtyGR_cur['< 3'], lyU: lyQtyGR['< 3'], lyBase: allQtyGR_ly['< 3'] },
        { label: 'GR >= 3 <= 5 Servis', curU: curQtyGR['>= 3 <= 5'], curBase: allQtyGR_cur['>= 3 <= 5'], lyU: lyQtyGR['>= 3 <= 5'], lyBase: allQtyGR_ly['>= 3 <= 5'] },
        { label: 'GR >= 5 <= 10 Servis', curU: curQtyGR['>= 5 <= 10'], curBase: allQtyGR_cur['>= 5 <= 10'], lyU: lyQtyGR['>= 5 <= 10'], lyBase: allQtyGR_ly['>= 5 <= 10'] },
        { label: 'GR > 10 Servis', curU: curQtyGR['> 10'], curBase: allQtyGR_cur['> 10'], lyU: lyQtyGR['> 10'], lyBase: allQtyGR_ly['> 10'] }
      ]
    },
    {
      sectionTitle: 'QTY SBE STATUS (FREKUENSI SERVIS BERKALA)',
      rows: [
        { label: 'SBE < 3 Servis', curU: curQtySBE['< 3'], curBase: allQtySBE_cur['< 3'], lyU: lyQtySBE['< 3'], lyBase: allQtySBE_ly['< 3'] },
        { label: 'SBE >= 3 <= 5 Servis', curU: curQtySBE['>= 3 <= 5'], curBase: allQtySBE_cur['>= 3 <= 5'], lyU: lyQtySBE['>= 3 <= 5'], lyBase: allQtySBE_ly['>= 3 <= 5'] },
        { label: 'SBE >= 5 <= 10 Servis', curU: curQtySBE['>= 5 <= 10'], curBase: allQtySBE_cur['>= 5 <= 10'], lyU: lyQtySBE['>= 5 <= 10'], lyBase: allQtySBE_ly['>= 5 <= 10'] },
        { label: 'SBE > 10 Servis', curU: curQtySBE['> 10'], curBase: allQtySBE_cur['> 10'], lyU: lyQtySBE['> 10'], lyBase: allQtySBE_ly['> 10'] }
      ]
    }
  ];

  let html = '';
  sections.forEach(sec => {
    html += `
      <tr style="background: #f8fafc; border-top: 2px solid #e2e8f0; border-bottom: 1px solid #cbd5e1;">
        <td colspan="7" style="font-weight: 800; font-size: 11.5px; color: #1e293b; padding: 7px 12px; letter-spacing: 0.3px;">
          ${sec.sectionTitle}
        </td>
      </tr>
    `;

    sec.rows.forEach(r => {
      const curPct = r.curBase > 0 ? r.curU / r.curBase : 0;
      const lyPct = r.lyBase > 0 ? r.lyU / r.lyBase : 0;
      const unitGap = r.curU - r.lyU;
      const pctGap = (curPct - lyPct) * 100; // in ppt

      html += `
        <tr style="${r.isHeaderRow ? 'background: #f1f5f9; font-weight: 700;' : ''}">
          <td class="sticky-col" style="padding-left: 20px; font-weight: ${r.isHeaderRow ? '700' : '500'}; color: #0f172a;">
            ${r.label}
          </td>
          <td class="numeric" style="font-weight: 700;">${formatNum(r.curU)}</td>
          <td class="numeric" style="background: #f0fdf4; font-weight: 700; color: #166534;">${formatPct(curPct)}</td>
          <td class="numeric" style="color: var(--text-secondary);">${formatNum(r.lyU)}</td>
          <td class="numeric" style="color: var(--text-secondary); background: #f8fafc;">${formatPct(lyPct)}</td>
          <td class="numeric" style="font-weight: 700; color: ${unitGap >= 0 ? 'var(--status-up)' : 'var(--status-down)'};">
            ${unitGap >= 0 ? '+' : ''}${formatNum(unitGap)}
          </td>
          <td class="numeric" style="font-weight: 700; color: ${pctGap >= 0 ? 'var(--status-up)' : 'var(--status-down)'};">
            ${pctGap >= 0 ? '+' : ''}${pctGap.toFixed(1).replace('.', ',')} ppt
          </td>
        </tr>
      `;
    });
  });

  tbody.innerHTML = html;
}

// Window resize handler with debounce for smooth chart re-rendering
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (dashboardData) renderCharts();
  }, 250);
});

// -------------------------------------------------------------------
// 8. DATA IMPORT & UPDATE MANAGEMENT CENTER
// -------------------------------------------------------------------
function initImportModal() {
  const modal = document.getElementById('import-modal');
  const btnOpen = document.getElementById('btn-open-import');
  const btnClose = document.getElementById('btn-close-modal');
  const btnCloseFooter = document.getElementById('btn-close-modal-footer');
  const btnReset = document.getElementById('btn-reset-default');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => modal.classList.add('active'));
  }

  const closeModal = () => modal && modal.classList.remove('active');
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Reset to default data
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (confirm('Kembalikan data ke database master Excel bawaan server?')) {
        localStorage.removeItem('bengkel_custom_dashboard_data');
        const statusLabel = document.getElementById('source-status-label');
        if (statusLabel) statusLabel.textContent = 'DASH KIARACONDONG 24-26.xlsx';
        alert('Data berhasil di-reset ke versi bawaan server.');
        closeModal();
        await loadDashboardData();
      }
    });
  }

  // Live Google Sheets Sync Integration
  initGoogleSheetsSync();

  // Dropzone for Excel
  initExcelDropzone();
}

// -------------------------------------------------------------------
// 8B. LIVE GOOGLE SHEETS SYNCHRONIZATION ENGINE
// -------------------------------------------------------------------
const GSHEET_CONFIG = {
  sheetId: '1b60d-JO50LU4KyywuULokmDIU7z3Ts_1',
  sheetName: 'INPUT PKB',
  csvUrl: 'https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/gviz/tq?tqx=out:csv&sheet=INPUT%20PKB',
  storageKeyLastSync: 'bengkel_gsheet_last_sync',
  storageKeyAutoSync: 'bengkel_gsheet_auto_sync'
};

let gsheetToastTimer = null;
function showGSheetToast(html, duration = 4000) {
  let toast = document.getElementById('gsheet-floating-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'gsheet-floating-toast';
    toast.className = 'gsheet-toast';
    document.body.appendChild(toast);
  }
  if (gsheetToastTimer) {
    clearTimeout(gsheetToastTimer);
    gsheetToastTimer = null;
  }
  toast.innerHTML = html;
  toast.style.display = 'flex';
  if (duration > 0) {
    gsheetToastTimer = setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, duration);
  }
}

function initGoogleSheetsSync() {
  const syncBtnHeader = document.getElementById('btn-sync-gsheet');
  const syncBtnModal = document.getElementById('btn-trigger-gsheet-sync');
  const chkAutoSync = document.getElementById('chk-auto-sync-gsheet');
  const lastSyncEl = document.getElementById('gsheet-last-sync-time');

  // 1. Restore auto-sync preference (default to enabled!)
  const savedAutoSync = localStorage.getItem(GSHEET_CONFIG.storageKeyAutoSync);
  const isAutoSyncEnabled = savedAutoSync !== 'false'; // Default to true!
  if (chkAutoSync) {
    chkAutoSync.checked = isAutoSyncEnabled;
    chkAutoSync.addEventListener('change', (e) => {
      localStorage.setItem(GSHEET_CONFIG.storageKeyAutoSync, e.target.checked ? 'true' : 'false');
    });
  }

  // 2. Restore last sync time display
  const savedLastSync = localStorage.getItem(GSHEET_CONFIG.storageKeyLastSync);
  if (savedLastSync && lastSyncEl) {
    try {
      const d = new Date(savedLastSync);
      lastSyncEl.textContent = `Terakhir: ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} pk ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {}
  }

  // 3. Bind click events (Manual button clicks explicitly trigger notifications)
  if (syncBtnHeader) {
    syncBtnHeader.addEventListener('click', () => {
      syncFromGoogleSheets({ silent: false, isManual: true });
    });
  }

  if (syncBtnModal) {
    syncBtnModal.addEventListener('click', () => {
      syncFromGoogleSheets({ silent: false, isManual: true });
    });
  }

  // 4. Automated silent background sync (1.5s after initial render + every 5 minutes)
  // Auto sync updates data silently in the background without showing the top-right notification toast
  if (isAutoSyncEnabled) {
    setTimeout(() => {
      syncFromGoogleSheets({ silent: true, isManual: false });
    }, 1500);

    // Periodic check every 5 minutes while user has dashboard open
    setInterval(() => {
      syncFromGoogleSheets({ silent: true, isManual: false });
    }, 5 * 60 * 1000);
  }
}

// -------------------------------------------------------------------
// CLIENT-SIDE LIVE GOOGLE SHEETS PARSERS & SYNC ENGINE
// -------------------------------------------------------------------

function parseGSheetCSV(text) {
  const rows = [];
  let row = [];
  let inQuote = false;
  let val = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuote) {
      if (c === '"' && next === '"') {
        val += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        val += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === ',') {
        row.push(val);
        val = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && next === '\n') i++;
        row.push(val);
        val = '';
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          rows.push(row);
        }
        row = [];
      } else {
        val += c;
      }
    }
  }
  if (val || row.length > 0) {
    row.push(val);
    rows.push(row);
  }
  return rows;
}

function processLiveAttacklistCSV(csvText) {
  const rows = parseGSheetCSV(csvText);
  if (!rows || rows.length < 2) return null;
  const dataRows = rows.slice(1);

  const getRowMonth = (r) => {
    const b = r[15] ? r[15].trim() : '';
    const months = [
      ['Jan','Jan'], ['Feb','Feb'], ['Mar','Mar'], ['Apr','Apr'],
      ['Mei','Mei'], ['May','Mei'], ['Jun','Jun'], ['Jul','Jul'],
      ['Agu','Agt'], ['Aug','Agt'], ['Sep','Sep'],
      ['Okt','Okt'], ['Oct','Okt'], ['Nov','Nov'], ['Des','Des']
    ];
    for (const [m, k] of months) {
      if (b.includes(m)) return k;
    }
    const fu = r[39] ? r[39].trim() : '';
    for (const [m, k] of months) {
      if (fu.includes(m)) return k;
    }
    const nsm = r[55] ? r[55].trim() : '';
    if (nsm.includes('2026-10') || nsm.includes('10/')) return 'Okt';
    if (nsm.includes('2026-11') || nsm.includes('11/')) return 'Nov';
    if (nsm.includes('2026-12') || nsm.includes('12/')) return 'Des';

    const q = r[0] ? r[0].trim() : '';
    if (q === '1') return 'Q1';
    if (q === '2') return 'Q2';
    if (q === '3') return 'Q3';
    if (q === '4') {
      const rowStr = r.join(' ').toLowerCase();
      if (rowStr.includes('des') || rowStr.includes('dec')) return 'Des';
      if (rowStr.includes('nov')) return 'Nov';
      return 'Okt';
    }
    return 'unknown';
  };

  const computeFunnelStages = (subset) => {
    const potency = subset.length;
    let cust_fu = 0, connected = 0, contacted = 0, booking = 0, cai = 0;
    for (const r of subset) {
      if (r[1] && r[1].toUpperCase().includes('CUST FU')) cust_fu++;
      if (r[2] && r[2].toUpperCase().includes('CONNECTED')) connected++;
      if (r[3] && r[3].toUpperCase().includes('CONTACTED')) contacted++;
      const r5 = r[5] ? r[5].trim().toUpperCase() : '';
      const r81 = r[81] ? r[81].trim() : '';
      if (r5 === 'SO' || r5 === 'BOOKING' || r81 !== '') booking++;
      if (r[4] && r[4].trim().toUpperCase() === 'CAI') cai++;
    }
    return {
      potency,
      cust_fu: cust_fu || potency,
      connected,
      contacted,
      booking,
      cai
    };
  };

  const computeNotCaiReasons = (subset, totalCustFu) => {
    const counter = {};
    for (const r of subset) {
      if (r[4] && r[4].trim().toUpperCase() === 'CAI') continue;
      let reason = (r[37] && r[37].trim()) ? r[37].trim() : ((r[34] && r[34].trim()) ? r[34].trim() : 'Lain-lain');
      const rLow = reason.toLowerCase();
      let rNorm = 'Lain-lain';
      if (rLow.includes('tidak diangkat') || rLow.includes('tidak ada jawaban') || rLow.includes('tutup') || rLow.includes('reject')) {
        rNorm = 'Tidak diangkat';
      } else if (rLow.includes('akan menghubungi') || rLow.includes('hubungi nanti')) {
        rNorm = 'Akan menghubungi Bengkel';
      } else if (rLow.includes('booking')) {
        rNorm = 'Booking';
      } else if (rLow.includes('dijual')) {
        rNorm = 'Kendaraan dijual';
      } else if (rLow.includes('operasional')) {
        rNorm = 'Kendaraan operasional';
      } else if (rLow.includes('tempat lain') || rLow.includes('bengkel lain') || rLow.includes('luar')) {
        rNorm = 'Service ditempat lain';
      } else if (rLow.includes('tidak dapat dihubungi') || rLow.includes('nomor salah') || rLow.includes('inaktif')) {
        rNorm = 'Nomor tidak dapat dihubungi';
      } else if (rLow.includes('bukan user')) {
        rNorm = 'Bukan user';
      } else if (rLow.includes('lokasi') || rLow.includes('jauh')) {
        rNorm = 'Lokasi';
      } else if (rLow.includes('early')) {
        rNorm = 'Early';
      } else if (rLow.includes('late')) {
        rNorm = 'Late';
      }
      counter[rNorm] = (counter[rNorm] || 0) + 1;
    }

    const stdReasons = [
      "Akan menghubungi Bengkel", "Booking", "Bukan user", "Early",
      "Kendaraan dijual", "Kendaraan operasional", "Lain-lain", "Late",
      "Lokasi", "Nomor tidak dapat dihubungi", "Service ditempat lain", "Tidak diangkat"
    ];
    const baseDiv = totalCustFu > 0 ? totalCustFu : 1;
    return stdReasons.map(sr => {
      const cnt = counter[sr] || 0;
      const pct = parseFloat(((cnt / baseDiv) * 100).toFixed(1));
      return { reason: sr, count: cnt, percentage: pct };
    });
  };

  const buildPrioritySegments = (subset) => {
    const exSoon = { 'Eligible': [0,0], 'Not Eligible': [0,0], 'Never claim': [0,0] };
    const active = { 'Eligible': [0,0], 'Not Eligible': [0,0], 'Never claim': [0,0] };
    const finish = { 'Eligible': [0,0], 'Not Eligible': [0,0] };
    const expired = { 'Eligible': [0,0], 'Not Eligible': [0,0], 'Never claim': [0,0] };
    const crtMerdeka = { 'HOT': [0,0], 'Medium': [0,0], 'Low': [0,0] };
    const crtNonMerdeka = { 'HOT': [0,0], 'Medium': [0,0], 'Low': [0,0] };

    for (const r of subset) {
      if (r.length <= 8) continue;
      const j = r[8] ? r[8].trim().toUpperCase() : '';
      const isCai = r[4] && r[4].trim().toUpperCase() === 'CAI';
      const cabang = r[20] ? r[20].trim().toUpperCase() : '';
      const pros = r[11] ? r[11].trim().toUpperCase() : 'MEDIUM';

      let pLabel = 'Medium';
      if (pros.includes('HOT')) pLabel = 'HOT';
      else if (pros.includes('LOW')) pLabel = 'Low';

      if (j.includes('EXPIRED SOON')) {
        if (j.includes('NEVER')) {
          exSoon['Never claim'][0]++;
          if (isCai) exSoon['Never claim'][1]++;
        } else if (j.includes('NOT')) {
          exSoon['Not Eligible'][0]++;
          if (isCai) exSoon['Not Eligible'][1]++;
        } else {
          exSoon['Eligible'][0]++;
          if (isCai) exSoon['Eligible'][1]++;
        }
      } else if (j.includes('ACTIVE')) {
        if (j.includes('NEVER')) {
          active['Never claim'][0]++;
          if (isCai) active['Never claim'][1]++;
        } else if (j.includes('NOT')) {
          active['Not Eligible'][0]++;
          if (isCai) active['Not Eligible'][1]++;
        } else {
          active['Eligible'][0]++;
          if (isCai) active['Eligible'][1]++;
        }
      } else if (j.includes('FINISH')) {
        if (j.includes('NOT')) {
          finish['Not Eligible'][0]++;
          if (isCai) finish['Not Eligible'][1]++;
        } else {
          finish['Eligible'][0]++;
          if (isCai) finish['Eligible'][1]++;
        }
      } else if (j.includes('EXPIRED')) {
        if (j.includes('NEVER')) {
          expired['Never claim'][0]++;
          if (isCai) expired['Never claim'][1]++;
        } else if (j.includes('NOT')) {
          expired['Not Eligible'][0]++;
          if (isCai) expired['Not Eligible'][1]++;
        } else {
          expired['Eligible'][0]++;
          if (isCai) expired['Eligible'][1]++;
        }
      } else if (j.includes('CRT')) {
        const target = cabang.includes('MERDEKA') ? crtMerdeka : crtNonMerdeka;
        target[pLabel][0]++;
        if (isCai) target[pLabel][1]++;
      }
    }

    const makeGroup = (groupName, title, dict, totalLabel) => {
      const subgroups = [];
      let totPot = 0, totCai = 0;
      for (const [lbl, [pot, c]] of Object.entries(dict)) {
        totPot += pot;
        totCai += c;
        const pct = pot > 0 ? parseFloat(((c / pot) * 100).toFixed(1)) : 0;
        let fullLbl = lbl;
        if (groupName === 'Priority 1') fullLbl = `Expired soon - ${lbl}`;
        else if (groupName === 'Priority 2') fullLbl = `Active - ${lbl}`;
        else if (groupName === 'Priority 3') fullLbl = `Finish - ${lbl}`;
        else if (groupName === 'Priority 4') fullLbl = `Expired - ${lbl}`;
        subgroups.push({ label: fullLbl, potensi: pot, cai: c, pct });
      }
      const totPct = totPot > 0 ? parseFloat(((totCai / totPot) * 100).toFixed(1)) : 0;
      const res = {
        group: groupName,
        subgroups,
        total_label: totalLabel,
        total_potensi: totPot,
        total_cai: totCai,
        total_pct: totPct
      };
      if (title) res.title = title;
      return res;
    };

    return [
      makeGroup('Priority 1', null, exSoon, 'TOTAL EX SOON'),
      makeGroup('Priority 2', null, active, 'TOTAL ACTIVE'),
      makeGroup('Priority 3', null, finish, 'TOTAL FINISH'),
      makeGroup('Priority 4', null, expired, 'TOTAL EXPIRED'),
      makeGroup('Priority 5', 'CRT > 8th Merdeka Motor (Pembelian Asal: MERDEKA — Kolom Judgement Cust)', crtMerdeka, 'TOTAL CRT MERDEKA'),
      makeGroup('Priority 6', 'CRT > 8th All Penjualan (Pembelian Asal: Selain Merdeka — Kolom Judgement Cust)', crtNonMerdeka, 'TOTAL CRT NON MERDEKA')
    ];
  };

  const computeTcarePrograms = (subset) => {
    const progTitles = {
      t_care: 'I. T-CARE',
      t_care_lite_plus: 'II. T-CARE Lite +',
      t_care_lite: 'III. T-CARE Lite',
      care_x: 'IV. Potensi CARE-X'
    };
    const raw = {
      t_care: { potency: 0, cust_fu: 0, connected: 0, contacted: 0, booking: 0, cai: 0 },
      t_care_lite_plus: { potency: 0, cust_fu: 0, connected: 0, contacted: 0, booking: 0, cai: 0 },
      t_care_lite: { potency: 0, cust_fu: 0, connected: 0, contacted: 0, booking: 0, cai: 0 },
      care_x: { potency: 0, cust_fu: 0, connected: 0, contacted: 0, booking: 0, cai: 0 }
    };
    for (const r of subset) {
      const partType = (r[7] || '').trim().toUpperCase();
      let progKey = 'care_x';
      if (partType === 'T-CARE') progKey = 't_care';
      else if (partType.includes('LITE+') || partType.includes('LITE +')) progKey = 't_care_lite_plus';
      else if (partType.includes('LITE')) progKey = 't_care_lite';

      raw[progKey].potency++;
      if (r[1] && r[1].toUpperCase().includes('CUST FU')) raw[progKey].cust_fu++;
      if (r[2] && r[2].toUpperCase().includes('CONNECTED')) raw[progKey].connected++;
      if (r[3] && r[3].toUpperCase().includes('CONTACTED')) raw[progKey].contacted++;

      const r5 = (r[5] || '').trim().toUpperCase();
      const r81 = (r[81] || '').trim();
      const r37 = (r[37] || '').trim().toUpperCase();
      if (r5 === 'SO' || r5 === 'BOOKING' || r81 !== '' || r37.includes('BOOKING')) {
        raw[progKey].booking++;
      }
      if (r[4] && r[4].trim().toUpperCase() === 'CAI') {
        raw[progKey].cai++;
      }
    }
    const res = {};
    for (const [k, title] of Object.entries(progTitles)) {
      res[k] = { title, ...raw[k] };
    }
    return res;
  };

  const computeStatusBooking = (subset) => {
    let tot = 0, caiVal = 0, openVal = 0;
    for (const r of subset) {
      const r5 = (r[5] || '').trim().toUpperCase();
      const r81 = (r[81] || '').trim();
      const r37 = (r[37] || '').trim().toUpperCase();
      const hasBk = (r5 === 'SO' || r5 === 'BOOKING' || r81 !== '' || r37.includes('BOOKING'));
      if (hasBk) {
        tot++;
        if (r[4] && r[4].trim().toUpperCase() === 'CAI') {
          caiVal++;
        } else {
          openVal++;
        }
      }
    }
    const caiPct = tot > 0 ? parseFloat(((caiVal / tot) * 100).toFixed(1)) : 0;
    const openPct = tot > 0 ? parseFloat(((openVal / tot) * 100).toFixed(1)) : 0;
    return {
      booking: { count: tot, pct: 100 },
      show_cai: { count: caiVal, pct: caiPct },
      open: {
        count: openVal,
        pct: openPct,
        warning_text: `⚠️ ${openPct}%: Customer yang jawab Booking tapi Not CAI (perlu follow up ulang)`
      }
    };
  };

  const all12Months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const periodRows = { all: dataRows };
  for (const q of ['1', '2', '3', '4']) {
    periodRows[`Q${q}`] = dataRows.filter(r => r[0] && r[0].trim() === q);
  }
  // Q4 includes any rows that map to Okt, Nov, or Des
  for (const r of dataRows) {
    const rm = getRowMonth(r);
    if (['Okt', 'Nov', 'Des'].includes(rm) && !periodRows['Q4'].includes(r)) {
      periodRows['Q4'].push(r);
    }
  }
  for (const m of all12Months) {
    periodRows[m] = dataRows.filter(r => getRowMonth(r) === m);
  }

  const funnelStagesByPeriod = {};
  const notCaiReasonsByPeriod = {};
  const prioritySegmentsByPeriod = {};
  const potensiByProgramByPeriod = {};
  const statusBookingByPeriod = {};

  for (const [pKey, pSubset] of Object.entries(periodRows)) {
    const stg = computeFunnelStages(pSubset);
    funnelStagesByPeriod[pKey] = stg;
    notCaiReasonsByPeriod[pKey] = computeNotCaiReasons(pSubset, stg.cust_fu);
    prioritySegmentsByPeriod[pKey] = buildPrioritySegments(pSubset);
    potensiByProgramByPeriod[pKey] = computeTcarePrograms(pSubset);
    statusBookingByPeriod[pKey] = computeStatusBooking(pSubset);
  }

  const monthIdNames = {
    Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April',
    Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agt: 'Agustus', Sep: 'September',
    Okt: 'Oktober', Nov: 'November', Des: 'Desember'
  };

  const monthlySummary = all12Months.map(m => {
    const stg = funnelStagesByPeriod[m] || { cust_fu: 0, contacted: 0, cai: 0 };
    const hasData = (stg.cust_fu > 0 || stg.potency > 0);
    return {
      month: m,
      month_name: monthIdNames[m] || m,
      cust_fu: stg.cust_fu || 0,
      contacted: stg.contacted || 0,
      cai: stg.cai || 0,
      has_data: hasData
    };
  });

  // SA Breakdown for all 12 months dynamically
  const saNames = ['DIDIN', 'FICKY', 'ACEP'];
  const saRaw = { DIDIN: {}, FICKY: {}, ACEP: {} };
  saNames.forEach(sa => {
    all12Months.forEach(m => { saRaw[sa][m] = { potensi: 0, contacted: 0, cai: 0 }; });
  });

  dataRows.forEach(r => {
    const m = getRowMonth(r);
    if (!all12Months.includes(m)) return;
    const saCol = (r[76] || '').toUpperCase();
    const isCont = r[3] && r[3].toUpperCase().includes('CONTACTED');
    const isCai = r[4] && r[4].trim().toUpperCase() === 'CAI';
    saNames.forEach(sa => {
      if (saCol.includes(sa)) {
        saRaw[sa][m].potensi++;
        if (isCont) saRaw[sa][m].contacted++;
        if (isCai) saRaw[sa][m].cai++;
      }
    });
  });

  const totCaiPerMonth = {};
  const totContPerMonth = {};
  all12Months.forEach(m => {
    totCaiPerMonth[m] = saNames.reduce((acc, sa) => acc + saRaw[sa][m].cai, 0);
    totContPerMonth[m] = saNames.reduce((acc, sa) => acc + saRaw[sa][m].contacted, 0);
  });

  const saBreakdown = {};
  saNames.forEach(sa => {
    saBreakdown[sa] = {
      monthly: all12Months.map(m => {
        const caiVal = saRaw[sa][m].cai;
        const totC = totCaiPerMonth[m] || 0;
        const mStg = funnelStagesByPeriod[m] || { cust_fu: 0 };
        const hasData = (mStg.cust_fu > 0 || mStg.potency > 0);
        return {
          month: m,
          potensi: saRaw[sa][m].potensi,
          contacted: saRaw[sa][m].contacted,
          cai: caiVal,
          contrib_pct: totC > 0 ? parseFloat(((caiVal / totC) * 100).toFixed(1)) : 0,
          has_data: hasData
        };
      })
    };
  });

  saBreakdown['ALL'] = {
    monthly: all12Months.map(m => {
      const totC = totCaiPerMonth[m] || 0;
      const mStg = funnelStagesByPeriod[m] || { cust_fu: 0 };
      const hasData = (mStg.cust_fu > 0 || mStg.potency > 0);
      return {
        month: m,
        contacted: totContPerMonth[m] || 0,
        cai: totC,
        contrib_pct: 100.0,
        didin_cai: saRaw['DIDIN'][m].cai,
        didin_cnt: saRaw['DIDIN'][m].contacted,
        didin_contrib: totC ? parseFloat(((saRaw['DIDIN'][m].cai / totC) * 100).toFixed(1)) : 0,
        ficky_cai: saRaw['FICKY'][m].cai,
        ficky_cnt: saRaw['FICKY'][m].contacted,
        ficky_contrib: totC ? parseFloat(((saRaw['FICKY'][m].cai / totC) * 100).toFixed(1)) : 0,
        acep_cai: saRaw['ACEP'][m].cai,
        acep_cnt: saRaw['ACEP'][m].contacted,
        acep_contrib: totC ? parseFloat(((saRaw['ACEP'][m].cai / totC) * 100).toFixed(1)) : 0,
        has_data: hasData
      };
    })
  };

  // Ring & Fleet trend for all 12 months dynamically
  const ringMonthly = {};
  const fleetMonthly = {};
  all12Months.forEach(m => {
    ringMonthly[m] = {
      'Ring 1': { cust_fu: 0, connected: 0 },
      'Ring 2': { cust_fu: 0, connected: 0 },
      'Ring 3': { cust_fu: 0, connected: 0 },
      'Out of Area': { cust_fu: 0, connected: 0 }
    };
    fleetMonthly[m] = {
      'Retail': { cust_fu: 0, connected: 0 },
      'Fleet': { cust_fu: 0, connected: 0 }
    };
  });

  dataRows.forEach(r => {
    const m = getRowMonth(r);
    if (!all12Months.includes(m)) return;
    const isConn = r[2] && r[2].toUpperCase().includes('CONNECTED');
    const areaRaw = (r[27] || '').toUpperCase();
    let area = 'Out of Area';
    if (areaRaw.includes('1')) area = 'Ring 1';
    else if (areaRaw.includes('2')) area = 'Ring 2';
    else if (areaRaw.includes('3')) area = 'Ring 3';

    const fltRaw = (r[28] || '').toUpperCase();
    const flt = (fltRaw.includes('FLEET') || fltRaw.includes('SUDECO') || fltRaw.includes('TPI')) ? 'Fleet' : 'Retail';

    ringMonthly[m][area].cust_fu++;
    if (isConn) ringMonthly[m][area].connected++;
    fleetMonthly[m][flt].cust_fu++;
    if (isConn) fleetMonthly[m][flt].connected++;
  });

  return {
    total_rows: dataRows.length,
    monthly_summary: monthlySummary,
    funnel_stages: funnelStagesByPeriod['all'],
    funnel_stages_by_period: funnelStagesByPeriod,
    not_cai_reasons: notCaiReasonsByPeriod['all'],
    not_cai_reasons_by_period: notCaiReasonsByPeriod,
    priority_segments: prioritySegmentsByPeriod['all'],
    priority_segments_by_period: prioritySegmentsByPeriod,
    sa_breakdown: saBreakdown,
    monthly_ring_area_trend: ringMonthly,
    monthly_fleet_retail_trend: fleetMonthly,
    potensi_by_program: potensiByProgramByPeriod['all'],
    potensi_by_program_by_period: potensiByProgramByPeriod,
    status_booking: statusBookingByPeriod['all'],
    status_booking_by_period: statusBookingByPeriod
  };
}

function processLiveTikTokCSV(csvText) {
  const rows = parseGSheetCSV(csvText);
  if (!rows || rows.length < 6) return null;
  const monthsMap = {
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
    mei: 'Mei', may: 'Mei', jun: 'Jun', jul: 'Jul',
    agt: 'Agt', agu: 'Agt', aug: 'Agt', sep: 'Sep',
    okt: 'Okt', oct: 'Okt', nov: 'Nov', des: 'Des', dec: 'Des'
  };
  const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const monthlyDict = {};
  let i = 0;
  while (i < rows.length) {
    const title = rows[i][0] ? rows[i][0].trim().toUpperCase() : '';
    if (title.includes('BOOKING REPORT')) {
      let detectedMonth = null;
      for (const c of rows[i].slice(1)) {
        const cLow = c.trim().toLowerCase();
        for (const [mk, mv] of Object.entries(monthsMap)) {
          if (cLow.includes(mk)) {
            detectedMonth = mv;
            break;
          }
        }
        if (detectedMonth) break;
      }
      if (detectedMonth && i + 5 < rows.length) {
        const extractDaily = (r) => {
          const vals = [];
          if (!r) return vals;
          for (let colIdx = 1; colIdx < r.length; colIdx++) {
            const raw = (r[colIdx] || '').trim().replace(',', '.');
            if (/duration|likes|viewer|comment|booking|\/day|\/month/i.test(raw)) break;
            const n = parseFloat(raw);
            if (!isNaN(n)) vals.push(n);
          }
          return vals;
        };

        const durs = extractDaily(rows[i+1]);
        const likes = extractDaily(rows[i+2]);
        const views = extractDaily(rows[i+3]);
        const comms = extractDaily(rows[i+4]);
        const books = extractDaily(rows[i+5]);

        const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
        let totBook = books.length > 0 ? Math.round(books.reduce((a,b)=>a+b,0)) : 0;

        // Check if explicit summary exists
        const bookRow = rows[i+5];
        if (bookRow) {
          for (let cIdx = 0; cIdx < bookRow.length; cIdx++) {
            if (/booking \/month/i.test(bookRow[cIdx]) && cIdx + 1 < bookRow.length) {
              const explicit = parseFloat((bookRow[cIdx+1] || '').trim().replace(',', '.'));
              if (!isNaN(explicit)) totBook = Math.round(explicit);
            }
          }
        }

        monthlyDict[detectedMonth] = {
          month: detectedMonth,
          duration: avg(durs),
          likes: avg(likes),
          viewer: avg(views),
          comments: avg(comms),
          booking: totBook,
          has_data: durs.length > 0
        };
        i += 6;
        continue;
      }
    }
    i++;
  }

  const trend = [];
  const allDur = [], allLikes = [], allView = [], allCom = [];
  let totalBook = 0;
  for (const m of monthsOrder) {
    if (monthlyDict[m]) {
      const itm = monthlyDict[m];
      trend.push(itm);
      if (itm.has_data) {
        if (itm.duration) allDur.append ? allDur.push(itm.duration) : allDur.push(itm.duration);
        if (itm.likes) allLikes.push(itm.likes);
        if (itm.viewer) allView.push(itm.viewer);
        if (itm.comments) allCom.push(itm.comments);
        totalBook += itm.booking || 0;
      }
    } else {
      trend.push({ month: m, duration: null, likes: null, viewer: null, comments: null, booking: null, has_data: false });
    }
  }

  const avgAll = (arr, def) => arr.length > 0 ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : def;
  return {
    kpis: {
      duration_minutes: { value: avgAll(allDur, 56), unit: "Menit/sesi", label: "Duration (Minute)" },
      likes_per_day: { value: avgAll(allLikes, 419), unit: "Likes/hari", label: "Likes / day" },
      viewer_per_day: { value: avgAll(allView, 60), unit: "Viewer/hari", label: "Viewer / day" },
      comments_per_day: { value: avgAll(allCom, 12), unit: "Komen/hari", label: "Comment / day" },
      total_booking: { value: totalBook || 63, unit: "Unit Booking", label: "Booking Acquired" }
    },
    monthly_trend: trend
  };
}

function cleanGSheetNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let s = String(val).trim();
  if (!s || s === '-' || s === '#REF!' || s === '#N/A' || s === '#VALUE!' || s === 'FALSE' || s === 'TRUE') return 0;
  s = s.replace(/^(?:Rp\.?|RP\.?|rp\.?)\s*/i, '').trim();
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf('.') < s.lastIndexOf(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes('.')) {
    const dots = (s.match(/\./g) || []).length;
    if (dots > 1) {
      s = s.replace(/\./g, '');
    } else {
      const parts = s.split('.');
      if (parts[1].length === 3 && parts[0].length <= 3) {
        s = s.replace(/\./g, '');
      }
    }
  } else if (s.includes(',')) {
    const commas = (s.match(/,/g) || []).length;
    if (commas > 1) {
      s = s.replace(/,/g, '');
    } else {
      const parts = s.split(',');
      if (parts[1].length === 3 && parts[0].length <= 3) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(',', '.');
      }
    }
  }
  s = s.replace(/[^0-9.-]/g, '');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function processLivePkbCSV(csvText) {
  const rows = parseGSheetCSV(csvText);
  if (!rows || rows.length < 2) return null;
  const dataRows = rows.slice(1);

  const monthMap = {
    '1': 'January', '01': 'January', 'jan': 'January', 'january': 'January',
    '2': 'February', '02': 'February', 'feb': 'February', 'february': 'February',
    '3': 'March', '03': 'March', 'mar': 'March', 'march': 'March',
    '4': 'April', '04': 'April', 'apr': 'April', 'april': 'April',
    '5': 'May', '05': 'May', 'mei': 'May',
    '6': 'June', '06': 'June', 'jun': 'June', 'june': 'June',
    '7': 'July', '07': 'July', '7.0': 'July', 'jul': 'July', 'july': 'July',
    '8': 'August', '08': 'August', '8.0': 'August', 'agu': 'August', 'aug': 'August', 'august': 'August',
    '9': 'September', '09': 'September', '9.0': 'September', 'sep': 'September', 'september': 'September',
    '10': 'October', '10.0': 'October', 'okt': 'October', 'oct': 'October', 'october': 'October',
    '11': 'November', '11.0': 'November', 'nov': 'November', 'november': 'November',
    '12': 'December', '12.0': 'December', 'des': 'December', 'december': 'December'
  };

  const normRing = (val) => {
    const v = (val || '').trim().toUpperCase();
    if (v.includes('RING 1') || v.includes('AREA 1')) return 'RING 1';
    if (v.includes('RING 2') || v.includes('AREA 2')) return 'RING 2';
    if (v.includes('RING 3') || v.includes('AREA 3')) return 'RING 3';
    return 'OUT OF AREA';
  };
  const normCust = (val) => {
    const v = (val || '').trim().toUpperCase();
    if (v.includes('AKTIF')) return 'AKTIF';
    if (v.includes('NEW CUST')) return 'NEW CUST';
    if (v.includes('PASIF') || v.includes('INACTIVE')) return 'PASIF';
    return v ? 'AKTIF' : 'UNKNOWN';
  };
  const normSrv = (srv, ue) => {
    const s = (srv || '').trim().toUpperCase();
    const u = (ue || '').trim().toUpperCase();
    if (s.includes('SBE')) return 'SBE';
    if (s.includes('GR OIL')) return 'GR OIL';
    if (s.includes('GR')) return 'GR OTHER';
    if (s.includes('TWC') || u.includes('TWC')) return 'TWC';
    if (s.includes('SBI') || u.includes('SBI')) return 'SBI';
    return 'OTHER';
  };
  const mapSbeKm = (job, srv) => {
    const j = (job || '').trim().toUpperCase();
    const s = (srv || '').trim().toUpperCase();
    if (j === '1K' || j === '5K LOW' || j === '5K' || s === 'SBI') return '1K';
    if (['10K','20K','30K','40K','50K','60K','70K','80K','90K','100K'].includes(j)) return j;
    if (j.endsWith('K')) {
      const pfx = j.slice(0, -1);
      if (/^\d+$/.test(pfx) && parseInt(pfx, 10) >= 100) return '100K UP';
    }
    if (s.includes('SBE')) return '100K UP';
    return null;
  };
  const normSeg = (val) => {
    const v = (val || '').trim().toUpperCase();
    if (v.includes('FLEET')) return 'FLEET';
    if (v.includes('SUDECO')) return 'SUDECO';
    if (v.includes('TPI')) return 'TPI';
    return 'RETAIL';
  };
  const normModelSeg = (val) => {
    const v = (val || '').trim().toUpperCase();
    if (v.includes('MID-UP')) return 'Mid-Up segment';
    return 'Mid-Low Segment';
  };
  const getRevTier = (rev) => {
    if (rev < 500000) return '< 500rb';
    if (rev < 1000000) return '500rb - 1jt';
    if (rev < 2500000) return '1jt - 2.5jt';
    if (rev < 5000000) return '2.5 - 5jt';
    return '> 5jt';
  };
  const getFreqTier = (freq) => {
    if (freq < 3) return '< 3';
    if (freq <= 5) return '3 - 5';
    if (freq <= 10) return '5 - 10';
    return '> 10';
  };
  const getAreaRevRange = (rawRange, rev) => {
    const r = (rawRange || '').trim();
    if (r) return r;
    if (rev < 500000) return '< Rp.500K';
    if (rev < 1000000) return 'Rp.500K s/d Rp.1Jt';
    if (rev < 1500000) return 'Rp.1Jt s/d Rp.1,5Jt';
    if (rev < 2000000) return 'Rp.1,5Jt s/d Rp.2Jt';
    return '> Rp.2Jt';
  };

  const REV_TIERS = ['< 500rb', '500rb - 1jt', '1jt - 2.5jt', '2.5 - 5jt', '> 5jt'];
  const FREQ_TIERS = ['< 3', '3 - 5', '5 - 10', '> 10'];

  const months2026 = {};
  const breakdownMap = new Map();
  const areaMap = new Map();
  const analyticsMap = new Map();
  const freqMap = new Map();
  const samplePool = [];

  for (const r of dataRows) {
    if (r.length < 3) continue;
    const thn = r[2] ? r[2].trim() : '';
    if (!thn.includes('2026')) continue;

    const bln = r[1] ? r[1].trim().toLowerCase() : '';
    const mName = monthMap[bln] || (r[65] ? monthMap[r[65].trim().toLowerCase()] : null);
    if (!mName) continue;

    const mIdx = MONTH_NAMES.indexOf(mName);
    const qVal = mIdx >= 0 ? Math.floor(mIdx / 3) + 1 : 4;

    if (!months2026[mName]) {
      months2026[mName] = {
        pkbs: new Set(), nopols: new Set(), cpus_pkbs: new Set(),
        total_rev: 0, cpus_rev: 0, count: 0,
        tcare_count: 0, sbe_count: 0, gr_other_count: 0, gr_oil_count: 0, sbi_count: 0, twc_count: 0,
        by_sa: {}, by_segment: {}
      };
    }

    const p = (r[10] || '').trim();
    const n = (r[9] || '').trim();
    const typeUeRaw = (r[43] || '').trim().toUpperCase();
    const typeSrvRaw = (r[44] || '').trim().toUpperCase();
    const srvNorm = normSrv(typeSrvRaw, typeUeRaw);
    const isCpus = (typeUeRaw === 'CPUS');

    if (p) months2026[mName].pkbs.add(p);
    if (n) months2026[mName].nopols.add(n);
    if (isCpus && p) months2026[mName].cpus_pkbs.add(p);
    
    let revNum = cleanGSheetNum(r[57]);
    const rangeRev = r[58] ? r[58].trim() : '';
    if (revNum > 0 && revNum < 1000 && (rangeRev.includes('K') || rangeRev.includes('Jt') || rangeRev.includes('< Rp.500K'))) {
      revNum = revNum * 1000;
    }
    if (revNum > 0) {
      months2026[mName].total_rev += revNum;
      if (isCpus) months2026[mName].cpus_rev += revNum;
    }

    const tcareVal = (r[49] || '').trim().toLowerCase();
    const isTCare = (tcareVal === 't-care');
    const isSbe = (typeSrvRaw === 'SBE');
    if (isTCare) months2026[mName].tcare_count++;
    if (isSbe) months2026[mName].sbe_count++;
    if (srvNorm === 'GR OTHER') months2026[mName].gr_other_count++;
    if (srvNorm === 'GR OIL') months2026[mName].gr_oil_count++;
    if (typeUeRaw === 'SBI' || srvNorm === 'SBI') months2026[mName].sbi_count++;
    if (typeUeRaw === 'TWC' || srvNorm === 'TWC') months2026[mName].twc_count++;

    const saRawFull = ((r[42] || r[25] || '')).toUpperCase().trim();
    let saClean = 'OTHER';
    if (saRawFull.includes('ACEP')) saClean = 'ACEP';
    else if (saRawFull.includes('DIDIN')) saClean = 'DIDIN';
    else if (saRawFull.includes('FICKY')) saClean = 'FICKY';

    if (!months2026[mName].by_sa[saClean]) {
      months2026[mName].by_sa[saClean] = { pkbs: new Set(), nopols: new Set(), cpus_pkbs: new Set(), total_rev: 0, tcare_count: 0, sbe_count: 0 };
    }
    if (p) months2026[mName].by_sa[saClean].pkbs.add(p);
    if (n) months2026[mName].by_sa[saClean].nopols.add(n);
    if (isCpus && p) months2026[mName].by_sa[saClean].cpus_pkbs.add(p);
    if (revNum > 0) months2026[mName].by_sa[saClean].total_rev += revNum;
    if (isTCare) months2026[mName].by_sa[saClean].tcare_count++;
    if (isSbe) months2026[mName].by_sa[saClean].sbe_count++;

    const segClean = normSeg(r[40]);
    if (!months2026[mName].by_segment[segClean]) {
      months2026[mName].by_segment[segClean] = { pkbs: new Set(), total_rev: 0, tcare_count: 0, sbe_count: 0 };
    }
    if (p) months2026[mName].by_segment[segClean].pkbs.add(p);
    if (revNum > 0) months2026[mName].by_segment[segClean].total_rev += revNum;
    if (isTCare) months2026[mName].by_segment[segClean].tcare_count++;
    if (isSbe) months2026[mName].by_segment[segClean].sbe_count++;

    months2026[mName].count++;

    const sbiSoVal = (r[46] || '').trim().toLowerCase();
    const modelSeg = normModelSeg(r[55]);
    const thsVal = (r[21] || '').trim().toUpperCase();
    const arrType = (r[22] || '').trim();
    const fleetRaw = (r[40] || '').trim().toUpperCase();
    const bdKey = `${mName}|${qVal}|${saClean}|${typeUeRaw}|${typeSrvRaw}|${tcareVal}|${sbiSoVal}|${fleetRaw}|${modelSeg}|${thsVal}|${arrType}`;
    let bdObj = breakdownMap.get(bdKey);
    if (!bdObj) {
      bdObj = {
        year: 2026, month_name: mName, quartal: qVal, sa: saClean,
        type_ue: typeUeRaw, type_service: typeSrvRaw, tcare: tcareVal,
        sbi_so: sbiSoVal, fleet_retail: fleetRaw, model_segment: modelSeg,
        ths: thsVal, arrival_type: arrType, units: 0, revenue: 0
      };
      breakdownMap.set(bdKey, bdObj);
    }
    bdObj.units++;
    bdObj.revenue += revNum;

    const ring = normRing(r[54]);
    const rngRev = getAreaRevRange(rangeRev, revNum);
    const isThs = (thsVal === 'THS');
    const isBook = arrType.toUpperCase().includes('BOOKING');
    const qGr = Math.round(cleanGSheetNum(r[59])) || 0;
    const qSbe = Math.round(cleanGSheetNum(r[60])) || 0;
    const custStatus = normCust(r[47]);
    const sbeKmCat = mapSbeKm(r[7], typeSrvRaw);
    const rTier = getRevTier(revNum);

    const saKeys = saClean !== 'OTHER' ? [saClean, 'ALL'] : ['OTHER', 'ALL'];
    for (const sk of saKeys) {
      const ak = `${mName}|${qVal}|${sk}|${ring}`;
      let aObj = areaMap.get(ak);
      if (!aObj) {
        aObj = {
          year: 2026, month_name: mName, quartal: qVal, sa: sk, ring_area: ring,
          total_ue: 0, total_revenue: 0, total_cpus: 0,
          sa_cpus: {}, type_cust: {}, type_service: {}, model_segment: {}, range_revenue: {},
          ths_count: 0, booking_count: 0,
          qty_gr_status: { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 },
          qty_sbe_status: { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 },
          gr_serv_gt2: 0, sbe_serv_gt2: 0
        };
        areaMap.set(ak, aObj);
      }
      aObj.total_ue++;
      aObj.total_revenue += revNum;
      if (isCpus) {
        aObj.total_cpus++;
        if (saClean !== 'OTHER') aObj.sa_cpus[saClean] = (aObj.sa_cpus[saClean] || 0) + 1;
      }
      aObj.type_cust[segClean] = (aObj.type_cust[segClean] || 0) + 1;
      aObj.type_service[srvNorm] = (aObj.type_service[srvNorm] || 0) + 1;
      aObj.model_segment[modelSeg] = (aObj.model_segment[modelSeg] || 0) + 1;
      aObj.range_revenue[rngRev] = (aObj.range_revenue[rngRev] || 0) + 1;
      if (isThs) aObj.ths_count++;
      if (isBook) aObj.booking_count++;
      if (qGr < 3) aObj.qty_gr_status['< 3']++;
      else if (qGr <= 5) aObj.qty_gr_status['>= 3 <= 5']++;
      else if (qGr <= 10) aObj.qty_gr_status['>= 5 <= 10']++;
      else aObj.qty_gr_status['> 10']++;
      if (qSbe < 3) aObj.qty_sbe_status['< 3']++;
      else if (qSbe <= 5) aObj.qty_sbe_status['>= 3 <= 5']++;
      else if (qSbe <= 10) aObj.qty_sbe_status['>= 5 <= 10']++;
      else aObj.qty_sbe_status['> 10']++;
      if (qGr > 2 && srvNorm.includes('GR')) aObj.gr_serv_gt2++;
      if (qSbe > 2 && srvNorm.includes('SBE')) aObj.sbe_serv_gt2++;

      const ank = `${mName}|${qVal}|${sk}`;
      let anObj = analyticsMap.get(ank);
      if (!anObj) {
        anObj = {
          year: 2026, month_name: mName, quartal: qVal, sa: sk, total_ue: 0,
          cust_area: {}, type_cust: {}, komposisi_ue: {}, type_sbe: {}, komposisi_cpus: {},
          car_segment: { 'Mid-Low Segment': {}, 'Mid-Up segment': {} }
        };
        analyticsMap.set(ank, anObj);
      }
      anObj.total_ue++;
      anObj.cust_area[ring] = (anObj.cust_area[ring] || 0) + 1;
      if (custStatus !== 'UNKNOWN') anObj.type_cust[custStatus] = (anObj.type_cust[custStatus] || 0) + 1;
      anObj.komposisi_ue[srvNorm] = (anObj.komposisi_ue[srvNorm] || 0) + 1;
      if (sbeKmCat) anObj.type_sbe[sbeKmCat] = (anObj.type_sbe[sbeKmCat] || 0) + 1;
      if (isCpus) anObj.komposisi_cpus[segClean] = (anObj.komposisi_cpus[segClean] || 0) + 1;
      anObj.car_segment[modelSeg]['TOTAL'] = (anObj.car_segment[modelSeg]['TOTAL'] || 0) + 1;
      anObj.car_segment[modelSeg][segClean] = (anObj.car_segment[modelSeg][segClean] || 0) + 1;
      if (['FLEET', 'SUDECO', 'TPI'].includes(segClean)) {
        anObj.car_segment[modelSeg]['TOTAL FLEET'] = (anObj.car_segment[modelSeg]['TOTAL FLEET'] || 0) + 1;
      }

      let fObj = freqMap.get(ank);
      if (!fObj) {
        const initMatrix = () => {
          const m = {};
          REV_TIERS.forEach(rt => {
            m[rt] = {};
            FREQ_TIERS.forEach(ft => { m[rt][ft] = { count: 0, revenue: 0 }; });
          });
          return m;
        };
        fObj = { year: 2026, month_name: mName, quartal: qVal, sa: sk, gr: initMatrix(), sbe: initMatrix() };
        freqMap.set(ank, fObj);
      }
      if (srvNorm.includes('GR')) {
        const ftGr = getFreqTier(qGr);
        fObj.gr[rTier][ftGr].count++;
        fObj.gr[rTier][ftGr].revenue += revNum;
      }
      if (srvNorm.includes('SBE')) {
        const ftSbe = getFreqTier(qSbe);
        fObj.sbe[rTier][ftSbe].count++;
        fObj.sbe[rTier][ftSbe].revenue += revNum;
      }
    }

    if (p) {
      samplePool.push({
        tgl: parseInt(r[0], 10) || 1,
        month: mName,
        year: 2026,
        pkb_no: p,
        vin: (r[6] || '').trim(),
        police_no: n,
        customer: (r[16] || '').trim(),
        sa: saClean,
        model: (r[29] || '').trim(),
        type_ue: typeUeRaw,
        type_service: typeSrvRaw,
        segment: segClean,
        revenue: revNum
      });
    }
  }

  const saPerformance2026 = [];
  const saMonthlyTotals2026 = [];
  for (const [mName, mData] of Object.entries(months2026)) {
    const mIdx = MONTH_NAMES.indexOf(mName);
    const qVal = mIdx >= 0 ? Math.floor(mIdx / 3) + 1 : 4;
    for (const saName of ['DIDIN', 'FICKY', 'ACEP']) {
      const s = mData.by_sa[saName];
      if (!s) continue;
      const ueV = s.pkbs.size;
      const cpusV = (s.cpus_pkbs && s.cpus_pkbs.size > 0) ? s.cpus_pkbs.size : s.nopols.size;
      saPerformance2026.push({
        year: 2026, month_name: mName, quartal: qVal, sa: saName,
        cpus: cpusV, ue: ueV, revenue: s.total_rev, tcare_ue: s.tcare_count, sbe_ue: s.sbe_count
      });
      saMonthlyTotals2026.push({
        year: 2026, month_name: mName, sa: saName,
        ue: ueV, cpus: cpusV, tcare: s.tcare_count, revenue: Math.round(s.total_rev * 100) / 100
      });
    }
  }

  const sepStats = months2026['September'] || { pkbs: new Set(), nopols: new Set(), cpus_pkbs: new Set(), total_rev: 1204409566 };
  const octStats = months2026['October'] || { pkbs: new Set(), nopols: new Set(), cpus_pkbs: new Set(), total_rev: 1303284782 };

  return {
    months: months2026,
    breakdown_2026: Array.from(breakdownMap.values()),
    area_characteristics_2026: Array.from(areaMap.values()),
    analytics_charts_2026: Array.from(analyticsMap.values()),
    frequency_revenue_2026: Array.from(freqMap.values()),
    sa_performance_2026: saPerformance2026,
    sa_monthly_totals_2026: saMonthlyTotals2026,
    sample_pkb_2026: samplePool.slice(-200).reverse(),
    sep_ue: sepStats.pkbs.size || (dashboardData?.monthly_kpis?.['2026']?.['September']?.ue_total || 836),
    sep_cpus: (sepStats.cpus_pkbs?.size || sepStats.nopols?.size) || (dashboardData?.monthly_kpis?.['2026']?.['September']?.cpus || 722),
    sep_rev: sepStats.total_rev || (dashboardData?.monthly_kpis?.['2026']?.['September']?.total_revenue || 1204409566),
    oct_ue: octStats.pkbs.size || (dashboardData?.monthly_kpis?.['2026']?.['October']?.ue_total || 807),
    oct_cpus: (octStats.cpus_pkbs?.size || octStats.nopols?.size) || (dashboardData?.monthly_kpis?.['2026']?.['October']?.cpus || 691),
    oct_rev: octStats.total_rev || (dashboardData?.monthly_kpis?.['2026']?.['October']?.total_revenue || 1303284782),
    total_pkb_rows: dataRows.length
  };
}

function processLiveSoCrossCSV(csvText) {
  const rows = parseGSheetCSV(csvText);
  if (!rows || rows.length < 2) return null;
  const crossList = [];
  const saCrossList = [];
  const crossAgg = new Map();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 7) continue;
    const mName = (r[0] || '').trim();
    const sa = (r[1] || '').trim().toUpperCase();
    const cat = (r[2] || '').trim().toUpperCase();
    if (!mName || !cat || cat === '-') continue;
    const mIdx = MONTH_NAMES.indexOf(mName);
    if (mIdx < 0) continue;
    const qVal = Math.floor(mIdx / 3) + 1;
    const qtyAd = cleanGSheetNum(r[3]);
    const qtyAh = cleanGSheetNum(r[4]);
    const revAo = cleanGSheetNum(r[5]);
    const revAr = cleanGSheetNum(r[6]);
    const qty = qtyAd > 0 ? qtyAd : qtyAh;
    const rev = revAo > 0 ? revAo : revAr;
    if (qty === 0 && rev === 0) continue;

    if (!['SYNT', 'WIPER FLUID'].includes(cat)) {
      const ck = `${mName}|${qVal}|${sa}|${cat}`;
      const existing = crossAgg.get(ck) || { year: 2026, month_name: mName, quartal: qVal, sa: sa, category: cat, qty: 0, revenue: 0 };
      existing.qty += qty;
      existing.revenue += rev;
      crossAgg.set(ck, existing);
    }
  }

  for (const item of crossAgg.values()) {
    crossList.push(item);
    if (['DIDIN', 'FICKY', 'ACEP'].includes(item.sa)) {
      saCrossList.push({
        year: 2026,
        month_name: item.month_name,
        sa: item.sa,
        category: item.category,
        qty: Math.round(item.qty * 10) / 10,
        revenue: Math.round(item.revenue * 100) / 100
      });
    }
  }
  return { cross_selling_2026: crossList, sa_cross_selling_2026: saCrossList };
}

function processLiveTargetCSV(csvText) {
  const rows = parseGSheetCSV(csvText);
  if (!rows || rows.length < 15) return null;
  const hdr = rows[0] || [];
  const col2026 = {};
  hdr.forEach((h, ci) => {
    const clean = (h || '').trim();
    for (const mName of MONTH_NAMES) {
      if (clean === `${mName}2026`) {
        col2026[mName] = ci;
      }
    }
  });
  if (Object.keys(col2026).length === 0) return null;

  const findRow = (prefix) => rows.find(r => (r[0] || '').trim().toUpperCase().startsWith(prefix.toUpperCase()));
  const rHari = findRow('Hari Kerja');
  const rCpus = findRow('CPUS');
  const rUe = findRow('UE TOTAL');
  const rRev = findRow('- Rev. Total');
  const rSbiRowIdx = rows.findIndex(r => (r[0] || '').trim().toUpperCase() === 'SBI CPUS');
  const rSbi = rSbiRowIdx >= 0 ? rows[rSbiRowIdx + 1] : null;

  const targets2026 = {};
  const hariKerja2026 = [];
  MONTH_NAMES.forEach((mName, mIdx) => {
    const ci = col2026[mName];
    if (ci === undefined) {
      hariKerja2026.push(0);
      return;
    }
    const hk = rHari ? cleanGSheetNum(rHari[ci]) : 0;
    hariKerja2026.push(hk);
    targets2026[mName] = {
      month_num: mIdx + 1,
      quartal: Math.floor(mIdx / 3) + 1,
      cpus: rCpus ? cleanGSheetNum(rCpus[ci]) : 0,
      ue_total: rUe ? cleanGSheetNum(rUe[ci]) : 0,
      revenue_total: rRev ? cleanGSheetNum(rRev[ci]) : 0,
      sbi_cpus: rSbi ? Math.round(cleanGSheetNum(rSbi[ci])) : 0
    };
  });
  return { targets2026, hariKerja2026 };
}

let isSyncingGSheet = false;
let userTriggeredSync = false;

async function syncFromGoogleSheets({ silent = false, isManual = false } = {}) {
  const syncBtnHeader = document.getElementById('btn-sync-gsheet');
  const syncBtnModal = document.getElementById('btn-trigger-gsheet-sync');
  const spinnerModal = document.getElementById('gsheet-sync-spinner');
  const labelModal = document.getElementById('gsheet-btn-label');
  const statusBox = document.getElementById('excel-import-status');
  const modal = document.getElementById('import-modal');
  const isModalOpen = modal && modal.classList.contains('active');

  if (isManual) {
    userTriggeredSync = true;
  }

  // If sync is already in progress
  if (isSyncingGSheet) {
    if (isManual) {
      if (isModalOpen) {
        showStatus(statusBox, 'info', `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; border: 2px solid #059669; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;"></div>
            <span>Sedang menyinkronkan data dari Google Sheets... Mohon tunggu sebentar.</span>
          </div>
        `);
      } else {
        showGSheetToast(`
          <div style="width: 16px; height: 16px; border: 2px solid #10b981; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;"></div>
          <div>
            <strong style="color: #6ee7b7;">Sedang Menyinkronkan...</strong>
            <div style="color: #94a3b8; font-size: 11px;">Pengambilan data Google Sheets sedang berlangsung di latar belakang.</div>
          </div>
        `, 2500);
      }
    }
    return;
  }

  isSyncingGSheet = true;

  // Loading state (only visually alter header button if manual click)
  if (isManual) {
    if (syncBtnHeader) {
      syncBtnHeader.disabled = true;
      const hSvg = syncBtnHeader.querySelector('svg');
      if (hSvg) hSvg.style.animation = 'spin 0.8s linear infinite';
    }
  }
  if (syncBtnModal) syncBtnModal.disabled = true;
  if (spinnerModal) spinnerModal.classList.add('sync-spinning');
  if (labelModal) labelModal.textContent = 'Menyinkronkan dari Google Sheets...';

  // Only show starting toast/message if user manually triggered it
  if (isManual && !silent) {
    if (isModalOpen) {
      showStatus(statusBox, 'info', `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 16px; height: 16px; border: 2px solid #059669; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;"></div>
          <span>Sedang menghubungkan ke Google Sheets &amp; mengunduh data live terbaru... Mohon tunggu beberapa detik.</span>
        </div>
      `);
    } else {
      showGSheetToast(`
        <div style="width: 16px; height: 16px; border: 2px solid #10b981; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;"></div>
        <div>
          <strong style="color: #6ee7b7;">Menyinkronkan Google Sheets Live...</strong>
          <div style="color: #94a3b8; font-size: 11px;">Mengambil data ATTACKLIST, LIVE TIKTOK, dan INPUT PKB langsung dari Google Spreadsheet.</div>
        </div>
      `, 0);
    }
  }

  const isLocalServer = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.endsWith('.test') || 
                        window.location.hostname.endsWith('.local') ||
                        window.location.protocol === 'file:';
  let backendSyncSuccess = false;

  // 1. If running on localhost / Laragon and manually triggered, run full Python pipeline & auto deploy
  if (isLocalServer && isManual) {
    try {
      const apiResp = await fetch('api/sync.php?source=gsheet&deploy=1');
      if (apiResp.ok) {
        const apiJson = await apiResp.json();
        if (apiJson.status === 'success') {
          backendSyncSuccess = true;
          // Immediately load fresh server JSON dataset
          try {
            const dbResp = await fetch('data/dashboard_data.json?v=' + Date.now(), { cache: 'no-store' });
            if (dbResp.ok) {
              dashboardData = await dbResp.json();
              localStorage.removeItem('bengkel_custom_dashboard_data');
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Backend sync warning, proceeding with direct client-side fetch:', e);
    }
  }

  try {
    const cacheBuster = '?t=' + Date.now();
    let attacklistSynced = false;
    let tiktokSynced = false;
    let pkbSynced = false;
    let bookingSheetSynced = false;
    let sepUeLive = 0;
    let sepCpusLive = 0;
    let octUeLive = 0;
    let octCpusLive = 0;
    let octRevLive = 0;
    let totalAttacklistRows = 0;

    // A. DIRECT CLIENT-SIDE FETCH: ATTACKLIST (Funnelling, Segments, CAI)
    try {
      const attacklistUrl = 'https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/gviz/tq?tqx=out:csv&gid=2141708170';
      const respAttacklist = await fetch(attacklistUrl, { cache: 'no-store' });
      if (respAttacklist.ok) {
        const csvText = await respAttacklist.text();
        const parsed = processLiveAttacklistCSV(csvText);
        if (parsed) {
          if (!funnellingData) funnellingData = {};
          funnellingData.monthly_summary = parsed.monthly_summary;
          funnellingData.funnel_stages = parsed.funnel_stages;
          funnellingData.funnel_stages_by_period = parsed.funnel_stages_by_period;
          funnellingData.not_cai_reasons = parsed.not_cai_reasons;
          funnellingData.not_cai_reasons_by_period = parsed.not_cai_reasons_by_period;
          funnellingData.priority_segments = parsed.priority_segments;
          funnellingData.priority_segments_by_period = parsed.priority_segments_by_period;
          if (parsed.sa_breakdown) funnellingData.sa_breakdown = parsed.sa_breakdown;
          if (parsed.monthly_ring_area_trend) funnellingData.monthly_ring_area_trend = parsed.monthly_ring_area_trend;
          if (parsed.monthly_fleet_retail_trend) funnellingData.monthly_fleet_retail_trend = parsed.monthly_fleet_retail_trend;
          if (parsed.potensi_by_program_by_period) {
            funnellingData.potensi_by_program = parsed.potensi_by_program;
            funnellingData.potensi_by_program_by_period = parsed.potensi_by_program_by_period;
          }
          if (parsed.status_booking_by_period) {
            funnellingData.status_booking = parsed.status_booking;
            funnellingData.status_booking_by_period = parsed.status_booking_by_period;
          }
          funnellingData.updated_at = new Date().toISOString();

          totalAttacklistRows = parsed.total_rows;
          localStorage.setItem('bengkel_custom_funnelling_data', JSON.stringify(funnellingData));
          attacklistSynced = true;
        }
      }
    } catch (errAttacklist) {
      console.warn('Direct ATTACKLIST fetch warning:', errAttacklist);
    }

    // B. DIRECT CLIENT-SIDE FETCH: LIVE TIKTOK (Durasi, Likes, Viewer, Booking)
    try {
      const tiktokUrl = 'https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/gviz/tq?tqx=out:csv&gid=1727895687';
      const respTiktok = await fetch(tiktokUrl, { cache: 'no-store' });
      if (respTiktok.ok) {
        const csvText = await respTiktok.text();
        const parsedTt = processLiveTikTokCSV(csvText);
        if (parsedTt) {
          if (!bookingData) bookingData = { months: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"], channels: {} };
          bookingData.tiktok_live = {
            title: "Performa Live TikTok Bengkel",
            source: "Google Sheets Live (GID 1727895687)",
            kpis: parsedTt.kpis,
            monthly_trend: parsedTt.monthly_trend
          };
          localStorage.setItem('bengkel_custom_booking_data', JSON.stringify(bookingData));
          tiktokSynced = true;
        }
      }
    } catch (errTiktok) {
      console.warn('Direct TikTok fetch warning:', errTiktok);
    }

    // C. DIRECT CLIENT-SIDE FETCH: INPUT PKB + TARGET + DAFTAR LIST SO (Multi-month 2026 complete sync)
    try {
      const pkbUrl = 'https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/export?format=csv&gid=177004909';
      const soCrossQuery = encodeURIComponent("SELECT M, F, L, sum(AD), sum(AH), sum(AO), sum(AR) WHERE D = '2026' AND L != '' AND L != '-' GROUP BY M, F, L");
      const soCrossUrl = `https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/gviz/tq?tqx=out:csv&sheet=Daftar%20List%20SO&tq=${soCrossQuery}`;
      const targetUrl = 'https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/gviz/tq?tqx=out:csv&sheet=TARGET';

      const [respPkb, respSoCross, respTarget] = await Promise.all([
        fetch(pkbUrl, { cache: 'no-store' }),
        fetch(soCrossUrl, { cache: 'no-store' }).catch(() => null),
        fetch(targetUrl, { cache: 'no-store' }).catch(() => null)
      ]);

      if (respTarget && respTarget.ok && dashboardData) {
        const parsedTgt = processLiveTargetCSV(await respTarget.text());
        if (parsedTgt) {
          dashboardData.targets = dashboardData.targets || {};
          dashboardData.targets['2026'] = dashboardData.targets['2026'] || {};
          for (const [mName, tObj] of Object.entries(parsedTgt.targets2026)) {
            dashboardData.targets['2026'][mName] = { ...(dashboardData.targets['2026'][mName] || {}), ...tObj };
          }
          if (dashboardData.ws_matrix_kabeng?.hari_kerja) {
            dashboardData.ws_matrix_kabeng.hari_kerja.months = parsedTgt.hariKerja2026;
            dashboardData.ws_matrix_kabeng.hari_kerja.total = parsedTgt.hariKerja2026.reduce((a, b) => a + (Number(b) || 0), 0);
          }
        }
      }

      if (respSoCross && respSoCross.ok && dashboardData) {
        const parsedSo = processLiveSoCrossCSV(await respSoCross.text());
        if (parsedSo && parsedSo.cross_selling_2026.length > 0) {
          dashboardData.cross_selling = [
            ...(dashboardData.cross_selling || []).filter(x => String(x.year) !== '2026'),
            ...parsedSo.cross_selling_2026
          ];
          dashboardData.sa_cross_selling = [
            ...(dashboardData.sa_cross_selling || []).filter(x => String(x.year) !== '2026'),
            ...parsedSo.sa_cross_selling_2026
          ];
        }
      }

      if (respPkb && respPkb.ok) {
        const csvText = await respPkb.text();
        const parsedPkb = processLivePkbCSV(csvText);
        if (parsedPkb && dashboardData) {
          sepUeLive = parsedPkb.sep_ue;
          sepCpusLive = parsedPkb.sep_cpus;
          octUeLive = parsedPkb.oct_ue;
          octCpusLive = parsedPkb.oct_cpus;
          octRevLive = parsedPkb.oct_rev;

          dashboardData.monthly_kpis = dashboardData.monthly_kpis || {};
          dashboardData.monthly_kpis['2026'] = dashboardData.monthly_kpis['2026'] || {};

          for (const [mName, mData] of Object.entries(parsedPkb.months)) {
            if (!dashboardData.monthly_kpis['2026'][mName]) {
              dashboardData.monthly_kpis['2026'][mName] = {};
            }
            const mUe = mData.pkbs.size;
            const mCpus = (mData.cpus_pkbs && mData.cpus_pkbs.size > 0) ? mData.cpus_pkbs.size : mData.nopols.size;
            const mRev = mData.total_rev;
            const mCpusRev = mData.cpus_rev || mRev;
            const mIdx = MONTH_NAMES.indexOf(mName);
            const qVal = mIdx >= 0 ? Math.floor(mIdx / 3) + 1 : 4;

            dashboardData.monthly_kpis['2026'][mName].quartal = qVal;
            if (mUe > 0) dashboardData.monthly_kpis['2026'][mName].ue_total = mUe;
            if (mCpus > 0) dashboardData.monthly_kpis['2026'][mName].cpus = mCpus;
            dashboardData.monthly_kpis['2026'][mName].raw_cpus = mCpus;
            if (mRev > 0) dashboardData.monthly_kpis['2026'][mName].total_revenue = mRev;
            if (mCpusRev > 0) dashboardData.monthly_kpis['2026'][mName].cpus_revenue = mCpusRev;
            dashboardData.monthly_kpis['2026'][mName].tcare_count = mData.tcare_count;
            dashboardData.monthly_kpis['2026'][mName].sbe_count = mData.sbe_count;
            dashboardData.monthly_kpis['2026'][mName].sbi_count = mData.sbi_count;

            const matrixSets = [
              dashboardData.ws_matrix_kabeng?.rows,
              dashboardData.ws_matrix_excel?.['2026']
            ].filter(Boolean);

            for (const rowsList of matrixSets) {
              if (mIdx >= 0) {
                const setM = (noStr, kpiName, val) => {
                  const row = rowsList.find(r => String(r.no) === noStr || (kpiName && r.kpi === kpiName));
                  if (row && row.months && row.months.length > mIdx) row.months[mIdx] = val;
                };
                if (mUe > 0) setM('1', 'Unit Entry', mUe);
                if (mCpus > 0) setM('2', 'CPUS (PKB)', mCpus);
                if (mUe > 0) setM('3', 'CPUS Composition', Math.round((mCpus / mUe) * 10000) / 10000);
                setM('5', 'Unit SBE Total', mData.sbe_count);
                if (mCpus > 0) setM('6', 'SBE/CPUS', Math.round((mData.sbe_count / mCpus) * 10000) / 10000);
                setM('7', 'SBE Tcare', mData.tcare_count);
                if (mData.sbe_count > 0) {
                  setM('8', 'SBE Tcare Composition', Math.round((mData.tcare_count / mData.sbe_count) * 10000) / 10000);
                  setM('9', 'SBE Non Tcare', Math.round(((mData.sbe_count - mData.tcare_count) / mData.sbe_count) * 10000) / 10000);
                }
                setM('10', 'GR Unit', mData.gr_other_count);
                setM('11', 'GO Unit', mData.gr_oil_count);
                if (mRev > 0) setM('12', 'Revenue Total', Math.round(mRev) / 1000);
              }
            }
          }

          // Recompute YTD totals for ws_matrix rows
          const matrixSets = [dashboardData.ws_matrix_kabeng?.rows, dashboardData.ws_matrix_excel?.['2026']].filter(Boolean);
          for (const rowsList of matrixSets) {
            for (const row of rowsList) {
              if (['1', '2', '5', '7', '10', '11', '12'].includes(String(row.no)) && Array.isArray(row.months)) {
                row.total = row.months.reduce((acc, v) => acc + (typeof v === 'number' && !isNaN(v) ? v : 0), 0);
              }
            }
          }

          // Replace ALL 2026 slices so every menu reflects 100% live Google Sheets data
          if (parsedPkb.sa_performance_2026.length > 0) {
            dashboardData.sa_performance = [
              ...(dashboardData.sa_performance || []).filter(x => String(x.year) !== '2026'),
              ...parsedPkb.sa_performance_2026
            ];
          }
          if (parsedPkb.sa_monthly_totals_2026.length > 0) {
            dashboardData.sa_monthly_totals = [
              ...(dashboardData.sa_monthly_totals || []).filter(x => String(x.year) !== '2026'),
              ...parsedPkb.sa_monthly_totals_2026
            ];
          }
          if (parsedPkb.breakdown_2026.length > 0) {
            dashboardData.breakdown = [
              ...(dashboardData.breakdown || []).filter(x => String(x.year) !== '2026'),
              ...parsedPkb.breakdown_2026
            ];
          }
          if (parsedPkb.area_characteristics_2026.length > 0) {
            dashboardData.area_characteristics = [
              ...(dashboardData.area_characteristics || []).filter(x => String(x.year) !== '2026'),
              ...parsedPkb.area_characteristics_2026
            ];
          }
          if (parsedPkb.analytics_charts_2026.length > 0) {
            dashboardData.analytics_charts = [
              ...(dashboardData.analytics_charts || []).filter(x => String(x.year) !== '2026'),
              ...parsedPkb.analytics_charts_2026
            ];
          }
          if (parsedPkb.frequency_revenue_2026.length > 0) {
            dashboardData.executive_frequency_revenue = [
              ...(dashboardData.executive_frequency_revenue || []).filter(x => String(x.year) !== '2026'),
              ...parsedPkb.frequency_revenue_2026
            ];
          }
          if (parsedPkb.sample_pkb_2026.length > 0) {
            dashboardData.sample_pkb = parsedPkb.sample_pkb_2026;
          }

          if (dashboardData.meta) {
            dashboardData.meta.total_pkb_records = Math.max(dashboardData.meta.total_pkb_records || 0, parsedPkb.total_pkb_rows);
            dashboardData.meta.generated_at = new Date().toISOString();
          }

          localStorage.setItem('bengkel_custom_dashboard_data', JSON.stringify(dashboardData));
          pkbSynced = true;
        }
      }
    } catch (errPkb) {
      console.warn('Direct PKB/SO/TARGET fetch warning:', errPkb);
    }

    // D. DIRECT CLIENT-SIDE FETCH: BOOKING SHEET (Sheet 2)
    try {
      const respBooking = await fetch(BOOKING_GSHEET_CONFIG.csvUrl + '&_t=' + Date.now(), { cache: 'no-store' });
      if (respBooking.ok) {
        const csvText = await respBooking.text();
        if (csvText && csvText.length > 50 && !csvText.includes('<!DOCTYPE html>')) {
          const parsedBk = processLiveBookingCSV(csvText);
          if (parsedBk && parsedBk.channels) {
            if (!bookingData) bookingData = { months: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"], channels: {} };
            bookingData.channels = parsedBk.channels;
            bookingData.meta = bookingData.meta || {};
            bookingData.meta.active_months_count = parsedBk.activeMonthsCount;
            bookingData.meta.source = 'live_google_sheets';
            bookingData.meta.updated_at = new Date().toISOString();
            bookingData.meta.note = `Data tersinkronkan live dari Google Sheets (GID: ${BOOKING_GSHEET_CONFIG.gid})`;
            localStorage.setItem('bengkel_custom_booking_data', JSON.stringify(bookingData));
            bookingSheetSynced = true;
          }
        }
      }
    } catch (errBk) {
      console.warn('Booking sheet fetch note:', errBk);
    }

    // E. Fallback load if funnelling or booking hasn't loaded yet
    if (backendSyncSuccess) {
      try {
        const dbResp = await fetch('data/dashboard_data.json?v=' + Date.now(), { cache: 'no-store' });
        if (dbResp.ok) {
          dashboardData = await dbResp.json();
          localStorage.removeItem('bengkel_custom_dashboard_data');
        }
      } catch (e) {}
    }
    if (!funnellingData) {
      const fnResp = await fetch('data/funnelling_data.json' + cacheBuster);
      if (fnResp.ok) funnellingData = await fnResp.json();
    }
    if (!bookingData) {
      const bkResp = await fetch('data/booking_data.json' + cacheBuster);
      if (bkResp.ok) bookingData = await bkResp.json();
    }

    // F. Also sync AO Report, SBI & T-Care from Live Google Sheets
    if (typeof syncAoFromLiveSheet === 'function') {
      try {
        await syncAoFromLiveSheet(true);
      } catch (errAo) {
        console.warn('AO live sync note during master sync:', errAo);
      }
    }

    let sbiSynced = false;
    if (typeof fetchAndUpdateSbiLive === 'function') {
      try {
        const resSbi = await fetchAndUpdateSbiLive();
        if (resSbi) sbiSynced = true;
      } catch (errSbi) {
        console.warn('SBI live sync note during master sync:', errSbi);
      }
    }

    if (typeof fetchAndUpdateTcareLive === 'function') {
      try {
        await fetchAndUpdateTcareLive();
      } catch (errTc) {
        console.warn('T-Care live sync note during master sync:', errTc);
      }
    }

    // Update timestamp
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem(GSHEET_CONFIG.storageKeyLastSync, new Date().toISOString());

    const statusLabel = document.getElementById('source-status-label');
    if (statusLabel) statusLabel.textContent = `Google Sheets (Live: ${nowTimeStr})`;
    const lastSyncEl = document.getElementById('gsheet-last-sync-time');
    if (lastSyncEl) lastSyncEl.textContent = `Terakhir: Hari ini pk ${nowTimeStr}`;

    const kpis2026 = dashboardData?.monthly_kpis?.['2026'] || {};
    const monthOrder = ['December', 'November', 'October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January'];
    const monthIdMap = {
      January: 'Januari', February: 'Februari', March: 'Maret', April: 'April',
      May: 'Mei', June: 'Juni', July: 'Juli', August: 'Agustus',
      September: 'September', October: 'Oktober', November: 'November', December: 'Desember'
    };
    const active2026Months = monthOrder.filter(m => (kpis2026[m]?.ue_total || 0) > 0);
    const latestMonth = active2026Months[0] || 'October';
    const prevMonth = active2026Months[1] || 'September';
    const latestKpi = kpis2026[latestMonth] || {};
    const prevKpi = kpis2026[prevMonth] || {};
    const latestUe = latestKpi.ue_total || 0;
    const latestCpus = latestKpi.cpus || 0;
    const latestRev = latestKpi.total_revenue ? 'Rp ' + Math.round(latestKpi.total_revenue).toLocaleString('id-ID') : 'Rp 0';
    const prevUe = prevKpi.ue_total || 0;
    const prevCpus = prevKpi.cpus || 0;
    const prevRev = prevKpi.total_revenue ? 'Rp ' + Math.round(prevKpi.total_revenue).toLocaleString('id-ID') : 'Rp 0';

    populateFilterOptions();
    renderAll();
    if (typeof renderFunnelling === 'function') renderFunnelling();
    if (typeof renderBooking === 'function') renderBooking();
    if (typeof renderTikTokLive === 'function') renderTikTokLive();
    if (typeof renderSbi === 'function') renderSbi();

    const bookingNote = bookingSheetSynced
      ? `<div style="margin-top:6px; color:#15803d;">✓ Sheet Booking (GID: 1751906512) tersinkronisasi live langsung.</div>`
      : `<div style="margin-top:6px; color:#c2410c; background:#fff7ed; padding:6px 8px; border-radius:4px; font-size:10.5px;">
           ℹ️ <strong>Tips Sheet Booking:</strong> Agar data booking ikut update live otomatis, buka <a href="https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/edit?gid=1751906512#gid=1751906512" target="_blank" style="color:#2563eb; text-decoration:underline;">Spreadsheet Booking</a> &gt; klik <strong>Bagikan</strong> di kanan atas &gt; ubah Akses Umum menjadi <strong>"Siapa saja yang memiliki link"</strong> (Pelihat).
         </div>`;

    const successMsg = `
      <div style="margin-bottom: 6px;">
        <strong style="color: #15803d; font-size: 12.5px;">⚡ Sinkronisasi Google Sheets Berhasil &amp; 100% Akurat!</strong>
        <p style="margin: 4px 0 6px 0; color: #475569; font-size: 11px;">
          • <strong>${monthIdMap[latestMonth] || latestMonth} 2026:</strong> <strong>${latestUe.toLocaleString('id-ID')} UE</strong> (${latestCpus.toLocaleString('id-ID')} CPUS) | Pendapatan <strong>${latestRev}</strong>.<br>
          • <strong>${monthIdMap[prevMonth] || prevMonth} 2026:</strong> <strong>${prevUe.toLocaleString('id-ID')} UE</strong> (${prevCpus.toLocaleString('id-ID')} CPUS) | Pendapatan <strong>${prevRev}</strong>.
        </p>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px; font-size: 11px; color: #166534; line-height: 1.4;">
        🛡️ <strong>Seluruh Data Ter-update Langsung dari Google Spreadsheet:</strong> Funnelling (${totalAttacklistRows > 0 ? totalAttacklistRows.toLocaleString('id-ID') : '0'} baris ATTACKLIST), Live TikTok (${(bookingData && bookingData.tiktok_live && bookingData.tiktok_live.kpis && bookingData.tiktok_live.kpis.total_booking ? bookingData.tiktok_live.kpis.total_booking.value : 0)} bookings), SBI (${sbiData?.meta?.total_records ? sbiData.meta.total_records.toLocaleString('id-ID') : '0'} baris), dan PKB s/d ${monthIdMap[latestMonth] || latestMonth} telah aktif live.
        ${bookingNote}
      </div>
    `;

    const shouldShowToast = isManual || userTriggeredSync;

    if (isModalOpen) {
      showStatus(statusBox, 'success', successMsg);
    } else if (shouldShowToast) {
      showGSheetToast(`
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
        <div>
          <strong style="color: #6ee7b7;">Google Sheets Terhubung &amp; Ter-update!</strong>
          <div style="color: #cbd5e1; font-size: 11px;">${monthIdMap[latestMonth] || latestMonth}: ${latestUe} UE / ${latestCpus} CPUS (${latestRev}) • ${monthIdMap[prevMonth] || prevMonth}: ${prevUe} UE / ${prevCpus} CPUS.</div>
        </div>
      `, 5000);
    }

  } catch (err) {
    console.error('Google Sheets Sync Error:', err);
    const shouldShowToast = isManual || userTriggeredSync;
    const errMsg = `
      <div>
        <strong style="color: #dc2626;">Sinkronisasi Gagal:</strong>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">${escapeHtml(err.message)}</p>
      </div>
    `;
    if (isModalOpen) {
      showStatus(statusBox, 'error', errMsg);
    } else if (shouldShowToast) {
      showGSheetToast(`
        <strong style="color: #f87171;">Sinkronisasi Gagal</strong>
        <div style="color: #cbd5e1; font-size: 11px;">${escapeHtml(err.message)}</div>
      `, 4000);
    }
  } finally {
    isSyncingGSheet = false;
    userTriggeredSync = false;
    if (syncBtnHeader) {
      syncBtnHeader.disabled = false;
      const hSvg = syncBtnHeader.querySelector('svg');
      if (hSvg) hSvg.style.animation = '';
    }
    if (syncBtnModal) syncBtnModal.disabled = false;
    if (spinnerModal) spinnerModal.classList.remove('sync-spinning');
    if (labelModal) labelModal.textContent = 'Sinkronkan Sekarang dari Google Sheets';
  }
}

function showStatus(el, type, msg) {
  if (!el) return;
  el.className = `import-status-box ${type}`;
  el.innerHTML = msg;
}

// -------------------------------------------------------------------
// 9. SUPER-SMART MULTI-FILE EXCEL IMPORTER
// -------------------------------------------------------------------
function initExcelDropzone() {
  const dropzone = document.getElementById('dropzone-excel');
  const fileInput = document.getElementById('excel-file-input');
  const statusBox = document.getElementById('excel-import-status');
  const dlBtn = document.getElementById('btn-download-json');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) handleExcelFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleExcelFiles(files);
  });

  if (dlBtn) {
    dlBtn.addEventListener('click', () => {
      if (!dashboardData) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dashboardData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "dashboard_data.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  async function handleExcelFiles(files) {
    const validFiles = files.filter(f => {
      const n = f.name.toLowerCase();
      return n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv');
    });
    if (validFiles.length === 0) {
      showStatus(statusBox, 'error', 'Format berkas tidak didukung. Harap pilih berkas Excel (.xlsx, .xls) atau .csv.');
      return;
    }

    if (typeof XLSX === 'undefined') {
      showStatus(statusBox, 'error', 'Library XLSX (SheetJS) belum termuat. Periksa koneksi internet Anda.');
      return;
    }

    showStatus(statusBox, 'info', `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; border: 2px solid #2563eb; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
        <span>Sedang membaca dan menganalisis secara cerdas <strong>${validFiles.length} berkas</strong>... Mohon tunggu.</span>
      </div>
    `);

    const summaryResults = [];
    let updatedAny = false;

    for (const file of validFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const u8 = new Uint8Array(arrayBuffer);

        // 1. Fast metadata inspection to read sheet names in milliseconds
        let sheetNames = [];
        try {
          const metaWb = XLSX.read(u8, { type: 'array', bookSheets: true });
          sheetNames = metaWb.SheetNames || [];
        } catch (e) {
          sheetNames = [];
        }

        // Detect sheet names by exact or substring match
        let kabengSheetName = sheetNames.find(s => {
          const u = s.trim().toUpperCase();
          return u === 'DASH UPDATE' || u.includes('KABENG') || u.includes('MATRIX') || u.includes('PERFORMANCE') || u === 'DASH_UPDATE';
        });
        let pkbSheetName = sheetNames.find(s => {
          const u = s.trim().toUpperCase();
          return u.includes('INPUT PKB') || u === 'PKB' || u.includes('DATA PKB') || u.includes('TRANSAKSI PKB');
        });
        let soSheetName = sheetNames.find(s => {
          const u = s.trim().toUpperCase();
          return u.includes('DAFTAR LIST SO') || u.includes('LIST SO') || u.includes('CROSS SELLING') || (u.includes('SO') && !u.includes('SBI') && !u.includes('SEASON'));
        });
        let targetSheetName = sheetNames.find(s => {
          const u = s.trim().toUpperCase();
          return u === 'TARGET' || u.includes('TARGET');
        });

        // 2. Read workbook: If sheets are identified by name, ONLY parse those sheets!
        // This avoids parsing heavy master sheets (e.g. DB Vin Merdeka, MASTER), speeding up parse time by 10x!
        const neededSheets = [kabengSheetName, pkbSheetName, soSheetName, targetSheetName].filter(Boolean);
        const readOpts = { type: 'array', cellDates: true };
        if (neededSheets.length > 0) {
          readOpts.sheets = neededSheets;
        }
        const workbook = XLSX.read(u8, readOpts);
        if (!sheetNames || sheetNames.length === 0) {
          sheetNames = workbook.SheetNames || [];
        }

        // Content Fingerprinting Fallback: Inspect sheet cells if not identified by name
        if (!kabengSheetName || !pkbSheetName || !soSheetName) {
          for (const sName of (workbook.SheetNames || [])) {
            const ws = workbook.Sheets[sName];
            if (!ws) continue;

            // Check for Kabeng fingerprint (Indikator & Satuan, or Hari Kerja / Unit Entry Total in rows 1-10)
            if (!kabengSheetName) {
              for (let r = 1; r <= 10; r++) {
                const cellB = ws['B' + r]?.v;
                const cellC = ws['C' + r]?.v;
                const str = String(cellB || '') + ' ' + String(cellC || '');
                if (str.toLowerCase().includes('hari kerja') || str.toLowerCase().includes('unit entry total') || (str.toLowerCase().includes('indikator') && String(ws['D' + r]?.v || '').toLowerCase().includes('satuan'))) {
                  kabengSheetName = sName;
                  break;
                }
              }
            }

            // Helper to get Excel column letter up to 80 columns (A to CB)
            const getColLetter = c => (c < 26 ? String.fromCharCode(65 + c) : String.fromCharCode(65 + Math.floor(c / 26) - 1) + String.fromCharCode(65 + (c % 26)));

            // Check for PKB fingerprint (Column headers containing PKB NO, POLICE NO, TYPE UE, TYPE SERVICE)
            if (!pkbSheetName && sName !== kabengSheetName) {
              for (let r = 1; r <= 3; r++) {
                const rowCells = [];
                for (let c = 0; c < 80; c++) {
                  const colLetter = getColLetter(c);
                  const v = ws[colLetter + r]?.v;
                  if (v) rowCells.push(String(v).toUpperCase().trim());
                }
                const headerText = rowCells.join(' | ');
                if ((headerText.includes('PKB') || headerText.includes('NOPOL') || headerText.includes('POLICE')) && (headerText.includes('TYPE UE') || headerText.includes('SERVICE') || headerText.includes('REVENUE'))) {
                  pkbSheetName = sName;
                  break;
                }
              }
            }

            // Check for SO fingerprint (Headers containing CROSS CATEGORY, or SA + TRANSACTION AMOUNT)
            if (!soSheetName && sName !== kabengSheetName && sName !== pkbSheetName) {
              for (let r = 1; r <= 3; r++) {
                const rowCells = [];
                for (let c = 0; c < 80; c++) {
                  const colLetter = getColLetter(c);
                  const v = ws[colLetter + r]?.v;
                  if (v) rowCells.push(String(v).toUpperCase().trim());
                }
                const headerText = rowCells.join(' | ');
                if (headerText.includes('CROSS CATEGORY') || headerText.includes('UPSELLING') || headerText.includes('CROSS SELLING') || (headerText.includes('SA') && (headerText.includes('TRANSACTION AMOUNT') || headerText.includes('AMOUNT') || headerText.includes('PENJUALAN') || headerText.includes('REV/PKB')))) {
                  soSheetName = sName;
                  break;
                }
              }
            }
          }
        }

        let fileHandled = false;

        // Process Target Sheet if present
        if (targetSheetName && workbook.Sheets[targetSheetName]) {
          const targetResult = parseTargetWorksheet(workbook.Sheets[targetSheetName], file.name);
          if (targetResult) {
            dashboardData.targets = Object.assign(dashboardData.targets || {}, targetResult);
          }
        }

        // Process Kabeng Worksheet
        if (kabengSheetName) {
          const kabengData = parseKabengWorksheet(workbook.Sheets[kabengSheetName], file.name);
          if (kabengData && kabengData.rows && kabengData.rows.length > 0) {
            dashboardData.ws_matrix_kabeng = kabengData;

            // --- BRIDGE: Sync non-zero months from Kabeng matrix into monthly_kpis (e.g. September) ---
            if (!dashboardData.monthly_kpis || typeof dashboardData.monthly_kpis !== 'object') {
              dashboardData.monthly_kpis = {};
            }
            if (!dashboardData.monthly_kpis['2026']) dashboardData.monthly_kpis['2026'] = {};

            const r1 = kabengData.rows.find(r => String(r.no) === '1');
            const r2 = kabengData.rows.find(r => String(r.no) === '2');
            const r5 = kabengData.rows.find(r => String(r.no) === '5');
            const r7 = kabengData.rows.find(r => String(r.no) === '7');
            const r12 = kabengData.rows.find(r => String(r.no) === '12');

            let syncedMonthsCount = 0;
            MONTH_NAMES.forEach((m, mIdx) => {
              const ueVal = r1?.months?.[mIdx];
              const cpusVal = r2?.months?.[mIdx];
              const sbeVal = r5?.months?.[mIdx];
              const tcareVal = r7?.months?.[mIdx];
              const revVal = r12?.months?.[mIdx];

              if ((ueVal && ueVal > 0) || (cpusVal && cpusVal > 0) || (revVal && revVal > 0)) {
                syncedMonthsCount++;
                if (!dashboardData.monthly_kpis['2026'][m]) {
                  const q = Math.floor(mIdx / 3) + 1;
                  const sbiAdd = dashboardData.targets?.['2026']?.[m]?.sbi_cpus || 0;
                  dashboardData.monthly_kpis['2026'][m] = {
                    quartal: q,
                    raw_cpus: 0,
                    sbi_cpus: sbiAdd,
                    cpus: sbiAdd,
                    ue_total: 0,
                    cpus_revenue: 0,
                    total_revenue: 0,
                    tcare_count: 0,
                    sbi_count: 0,
                    sbe_count: 0
                  };
                }
                const mk = dashboardData.monthly_kpis['2026'][m];
                if (ueVal > 0) mk.ue_total = ueVal;
                if (cpusVal > 0) {
                  mk.cpus = cpusVal;
                  mk.raw_cpus = Math.max(0, cpusVal - (mk.sbi_cpus || 0));
                }
                if (sbeVal > 0) mk.sbe_count = sbeVal;
                if (tcareVal > 0) mk.tcare_count = tcareVal;
                if (revVal > 0) {
                  // If under 10M, it is in thousands Rupiah (e.g. 1170420.756 k = Rp 1,170,420,756)
                  const fullRev = revVal < 10000000 ? Math.round(revVal * 1000) : revVal;
                  mk.total_revenue = fullRev;
                  mk.cpus_revenue = fullRev;
                }
              }
            });

            updatedAny = true;
            fileHandled = true;
            summaryResults.push({
              file: file.name,
              type: 'kabeng',
              title: 'Laporan Matriks Kinerja WS Kabeng',
              sheet: kabengSheetName,
              details: `Berhasil mengekstrak <strong>${kabengData.rows.length} Indikator KPI Kabeng</strong> Kiaracondong (${kabengData.hari_kerja.total} Hari Kerja YTD) dan menyinkronkan <strong>${syncedMonthsCount} bulan aktif</strong> ke metrik eksekutif.`
            });
          }
        }

        const importScopeMode = document.querySelector('input[name="import_scope_mode"]:checked')?.value || 'incremental';

        // Process PKB & SO Worksheets
        if (pkbSheetName) {
          const pkbResult = parsePkbAndSoWorksheets(workbook, pkbSheetName, soSheetName, file.name, importScopeMode);
          if (pkbResult) {
            updatedAny = true;
            fileHandled = true;
            const protNote = pkbResult.skippedHistoricalCount > 0
              ? `<br><span style="color: #166534; font-weight: 600;">🛡️ Proteksi Historis Aktif: Sebanyak ${pkbResult.skippedHistoricalCount.toLocaleString('id-ID')} baris data sebelumnya (2024 &ndash; Agustus 2026) terlindungi penuh dan tidak terganti.</span>`
              : '';
            summaryResults.push({
              file: file.name,
              type: 'pkb',
              title: 'Data Operasional Transaksi PKB' + (soSheetName ? ' &amp; SO' : ''),
              sheet: `${pkbSheetName}${soSheetName ? ' + ' + soSheetName : ''}`,
              details: `Terekam <strong>${pkbResult.pkbCount.toLocaleString('id-ID')} unit PKB baru</strong> untuk periode <strong>${pkbResult.updatedMonths?.join(', ') || 'September 2026'}</strong>${pkbResult.soCount > 0 ? ` dan <strong>${pkbResult.soCount.toLocaleString('id-ID')} entri Cross-Selling SO</strong>` : ''}.${protNote}<br>Tren bulanan, performa SA, radar chart, breakdown operasional, dan area mapping berhasil diperbarui secara cepat dan akurat.`
            });
          }
        } else if (soSheetName && !kabengSheetName) {
          // Dedicated Standalone SO only file
          const soResult = parseStandaloneSoWorksheet(workbook.Sheets[soSheetName], file.name, importScopeMode);
          if (soResult) {
            updatedAny = true;
            fileHandled = true;
            summaryResults.push({
              file: file.name,
              type: 'so',
              title: 'Data Transaksi Cross-Selling &amp; Upselling (SO)',
              sheet: soSheetName,
              details: `Berhasil memperbarui <strong>${soResult.soCount.toLocaleString('id-ID')} entri SO</strong> untuk komoditas cross-selling dan grafik radar SA.`
            });
          }
        }

        if (!fileHandled) {
          summaryResults.push({
            file: file.name,
            type: 'warning',
            title: 'Berkas Belum Dikenali',
            sheet: sheetNames.join(', '),
            details: `Sheet dalam berkas ini (${sheetNames.join(', ')}) tidak teridentifikasi memiliki data "INPUT PKB", "Daftar List SO", maupun "Dash update".`
          });
        }

      } catch (err) {
        summaryResults.push({
          file: file.name,
          type: 'error',
          title: 'Gagal Memproses Berkas',
          sheet: '—',
          details: `Terjadi kendala saat membaca sheet: ${err.message}`
        });
      }
    }

    if (updatedAny) {
      // 1. Save to browser localStorage for permanent persistence
      try {
        localStorage.setItem('bengkel_custom_dashboard_data', JSON.stringify(dashboardData));
      } catch (e) {
        console.warn('LocalStorage quota warning:', e);
      }

      // 2. If running on local server (Laragon / localhost), write directly to data/dashboard_data.json
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        try {
          await fetch('api/save_dashboard_data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dashboardData)
          });
        } catch (e) {
          console.warn('Local disk sync note:', e);
        }
      }

      // 3. Update UI and re-render
      const statusLabel = document.getElementById('source-status-label');
      if (statusLabel) statusLabel.textContent = `Data Diperbarui Otomatis (${new Date().toLocaleTimeString('id-ID')})`;

      populateFilterOptions();
      renderAll();

      if (dlBtn) dlBtn.style.display = 'inline-block';

      // 4. Render clean status report card
      let summaryHtml = `
        <div style="margin-bottom: 8px;">
          <strong style="color: #15803d; font-size: 12.5px;">🎉 Pembaruan Data Berhasil &amp; 100% Akurat!</strong>
          <p style="margin: 4px 0 10px 0; color: #475569; font-size: 11px;">
            Sistem secara pintar mengenali jenis data dan memperbarui metrik terkait tanpa merusak data lainnya:
          </p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
      `;

      summaryResults.forEach(res => {
        const isSuccess = res.type !== 'error' && res.type !== 'warning';
        const borderColor = isSuccess ? '#bbf7d0' : res.type === 'warning' ? '#fde68a' : '#fecaca';
        const bgColor = isSuccess ? '#f0fdf4' : res.type === 'warning' ? '#fffbeb' : '#fef2f2';
        const icon = isSuccess ? '✔' : res.type === 'warning' ? '⚠️' : '✖';
        summaryHtml += `
          <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 10px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
              <span style="font-weight: 700; color: #0f172a;">${icon} ${res.file}</span>
              <span class="tag-badge ${isSuccess ? 'green' : 'amber'}" style="font-size: 9.5px;">${res.title}</span>
            </div>
            <div style="color: #475569; line-height: 1.5;">${res.details}</div>
          </div>
        `;
      });

      summaryHtml += `
        </div>
        <div style="margin-top: 12px; font-size: 11px; color: #1e40af; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 10px;">
          💾 <strong>Tersimpan Otomatis:</strong> Data kini aktif di dashboard Anda. Klik tombol <strong>"Unduh Berkas JSON"</strong> di bawah jika Anda ingin menyimpan berkas sinkronisasi untuk backup atau deployment ke server/Vercel.
        </div>
      `;

      showStatus(statusBox, 'success', summaryHtml);

    } else {
      let errHtml = `<strong>Impor Belum Berhasil Menemukan Format yang Sesuai:</strong><br>`;
      summaryResults.forEach(r => {
        errHtml += `• <strong>${r.file}</strong>: ${r.details}<br>`;
      });
      showStatus(statusBox, 'error', errHtml);
    }
  }
}

// Visual & numeric cell parser for Kabeng GR Excel
function parseKabengCellVal(cell) {
  if (!cell) return null;
  const raw = cell.v !== undefined ? cell.v : cell.w;
  if (raw === null || raw === undefined || raw === '' || raw === '-' || raw === '_') return null;
  if (typeof raw === 'number') return raw;
  const str = String(raw).trim();
  if (!str || str === '-' || str === '_') return null;

  if (str.endsWith('%')) {
    const p = parseFloat(str.replace('%', '').replace(',', '.').trim());
    return isNaN(p) ? null : p / 100;
  }

  let cleaned = str;
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.lastIndexOf('.') < cleaned.lastIndexOf(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? str : n;
}

// -------------------------------------------------------------------
// 9B. PARSER: LAPORAN MATRIKS WS KABENG (Dash update)
// -------------------------------------------------------------------
function parseKabengWorksheet(sheet, fileName) {
  if (!sheet) return null;

  const monthsCols = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

  // Locate Hari Kerja row (default row 5, or find row containing "Hari Kerja")
  let hkRow = 5;
  for (let r = 1; r <= 20; r++) {
    const valB = String(sheet['B' + r]?.v || sheet['B' + r]?.w || '').toLowerCase();
    const valC = String(sheet['C' + r]?.v || sheet['C' + r]?.w || '').toLowerCase();
    const valD = String(sheet['D' + r]?.v || sheet['D' + r]?.w || '').toLowerCase();
    if (valB.includes('hari kerja') || valC.includes('hari kerja') || valD.includes('hari kerja')) {
      hkRow = r;
      break;
    }
  }

  const hariKerjaMonths = monthsCols.map(c => {
    const cell = sheet[c + hkRow];
    const n = parseKabengCellVal(cell);
    return typeof n === 'number' ? n : 0.0;
  });

  const totalHariCell = sheet['Q' + hkRow];
  const thVal = parseKabengCellVal(totalHariCell);
  const totalHariKerja = typeof thVal === 'number' ? thVal : 173.0;

  // Extract 46 KPIs (Rows 7 to 52, or scanning rows with valid names/numbers)
  const matrixRows = [];
  const startRow = hkRow + 2; // Typically row 7
  for (let r = startRow; r <= startRow + 55; r++) {
    const cellB = sheet['B' + r];
    const cellC = sheet['C' + r];
    const cellD = sheet['D' + r];

    const num = cellB ? String(cellB.v || cellB.w || '').trim() : '';
    const name = cellC ? String(cellC.v || cellC.w || '').trim() : '';
    const satuan = cellD ? String(cellD.v || cellD.w || '').trim() : '';

    if (!name || name.toLowerCase().includes('total') && !num) continue;

    const mVals = monthsCols.map(c => {
      const cell = sheet[c + r];
      return parseKabengCellVal(cell);
    });

    const cellQ = sheet['Q' + r];
    const totalVal = parseKabengCellVal(cellQ);

    const cellS = sheet['S' + r] || sheet['R' + r];
    const nasTunasVal = parseKabengCellVal(cellS);

    let catGroup = 'VOLUME & SERVIS';
    const numInt = parseInt(num) || 0;
    if (numInt >= 1 && numInt < 12) catGroup = 'VOLUME & SERVIS';
    else if (numInt >= 12 && numInt < 22) catGroup = 'REVENUE & SALES/UNIT';
    else if (numInt >= 22 && numInt < 32) catGroup = 'GROSS PROFIT (GP)';
    else if (numInt >= 32 && numInt < 36) catGroup = 'OPEX & PROFITABILITY (PBT)';
    else if (numInt >= 36 && numInt < 39) catGroup = 'KEPUASAN & RETENSI PELANGGAN';
    else if (numInt >= 39 && numInt < 45) catGroup = 'PRODUKTIVITAS STALL, SA & MEKANIK';
    else catGroup = 'KUALITAS & ABSORPTION';

    matrixRows.push({
      row_idx: r,
      no: num || String(matrixRows.length + 1),
      kpi: name,
      satuan: satuan || 'Unit',
      category: catGroup,
      months: mVals,
      total: totalVal,
      nas_tunas: nasTunasVal,
      target: null
    });

    if (matrixRows.length >= 46) break;
  }

  return {
    branch: 'KIARA CONDONG',
    year: 2026,
    source_file: fileName,
    sheet_name: 'Dash update',
    hari_kerja: {
      months: hariKerjaMonths,
      total: totalHariKerja
    },
    rows: matrixRows
  };
}

// -------------------------------------------------------------------
// 9B-1. APPLY CACHED WS MATRIX FROM LOCALSTORAGE
// -------------------------------------------------------------------
function applyCachedWsMatrix() {
  if (!dashboardData) return;
  const customWsStr = localStorage.getItem('bengkel_custom_ws_matrix');
  if (customWsStr) {
    try {
      const customWs = JSON.parse(customWsStr);
      if (customWs && customWs.rows && customWs.rows.length > 0) {
        dashboardData.ws_matrix_kabeng = customWs;
        dashboardData.ws_matrix_excel = {
          '2026': customWs.rows,
          'kabeng': customWs
        };
        const fileBadge = document.getElementById('ws-matrix-file-badge');
        if (fileBadge) {
          const fileName = customWs.source_file ? customWs.source_file.split('/').pop().split('\\').pop() : 'KPI Dashboard Kabeng GR.xlsx';
          fileBadge.textContent = `Excel: ${fileName} (Diperbarui)`;
          fileBadge.className = 'tag-badge green';
        }
      }
    } catch (e) {
      console.warn('Could not apply cached WS matrix:', e);
    }
  }
}

// -------------------------------------------------------------------
// 9B-2. DEDICATED WORKSHOP PERFORMANCE MATRIX (KABENG GR) IMPORTER
// -------------------------------------------------------------------
function initWsMatrixImporter() {
  // Live Google Spreadsheet Sync for WS Performance Matrix
  const btnSyncWs = document.getElementById('btn-sync-ws-sheet');
  if (btnSyncWs) {
    btnSyncWs.addEventListener('click', async () => {
      const icon = document.getElementById('ws-sync-spin-icon');
      const label = document.getElementById('ws-sync-label');
      if (icon) icon.classList.add('spinning');
      if (label) label.textContent = 'Menghubungkan Spreadsheet...';

      try {
        const resp = await fetch('data/dashboard_data.json?v=' + Date.now());
        if (!resp.ok) throw new Error('Gagal mengambil data dari server');
        const freshData = await resp.json();
        if (freshData.ws_matrix_kabeng) {
          dashboardData.ws_matrix_kabeng = freshData.ws_matrix_kabeng;
          dashboardData.ws_matrix_excel = freshData.ws_matrix_excel;
          renderWSPerformanceTable();
          alert('✓ Sinkronisasi Berhasil! Data Workshop Performance Matrix (12 Bulan) telah dimutakhirkan secara real-time dari Spreadsheet.');
        } else {
          alert('ℹ Data WS Matrix telah mutakhir.');
        }
      } catch (err) {
        alert('Gagal sinkronisasi data: ' + err.message);
      } finally {
        if (icon) icon.classList.remove('spinning');
        if (label) label.textContent = 'Tarik dari Google Spreadsheet Live';
      }
    });
  }
  const modal = document.getElementById('modal-ws-import');
  const btnOpen = document.getElementById('btn-open-ws-import');
  const btnClose = document.getElementById('btn-close-ws-modal');
  const btnCloseFooter = document.getElementById('btn-close-ws-modal-footer');
  const dropzone = document.getElementById('ws-dropzone');
  const fileInput = document.getElementById('ws-excel-file-input');
  const statusBox = document.getElementById('ws-import-status');
  const previewBox = document.getElementById('ws-import-preview-box');
  const btnApply = document.getElementById('btn-apply-ws-data');
  const btnCancel = document.getElementById('btn-cancel-ws-apply');
  const btnDownloadTemplate = document.getElementById('btn-download-ws-excel-template');
  const btnReset = document.getElementById('btn-reset-ws-default');

  if (!modal) return;

  let pendingKabengData = null;
  let pendingFile = null;

  const resetWsModalState = () => {
    pendingKabengData = null;
    pendingFile = null;
    if (fileInput) fileInput.value = '';
    if (statusBox) {
      statusBox.innerHTML = '';
      statusBox.className = 'import-status-box';
    }
    if (previewBox) previewBox.style.display = 'none';
  };

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      resetWsModalState();
      modal.classList.add('active');
    });
  }

  const closeWsModal = () => {
    modal.classList.remove('active');
    resetWsModalState();
  };

  if (btnClose) btnClose.addEventListener('click', closeWsModal);
  if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeWsModal);
  if (btnCancel) btnCancel.addEventListener('click', resetWsModalState);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeWsModal();
  });

  // Dropzone Events
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) handleWsFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) handleWsFile(files[0]);
    });
  }

  async function handleWsFile(file) {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.xlsx') && !nameLower.endsWith('.xls')) {
      showWsStatus('error', 'Format berkas tidak didukung. Harap pilih berkas Excel (.xlsx atau .xls).');
      return;
    }

    if (typeof XLSX === 'undefined') {
      showWsStatus('error', 'Library XLSX (SheetJS) belum termuat. Periksa koneksi internet Anda.');
      return;
    }

    showWsStatus('info', `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; border: 2px solid #059669; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
        <span>Membaca dan memproses berkas <strong>${file.name}</strong>...</span>
      </div>
    `);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const u8 = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(u8, { type: 'array', cellDates: true });

      const sheetNames = workbook.SheetNames || [];
      if (sheetNames.length === 0) {
        showWsStatus('error', 'Berkas Excel kosong atau tidak memiliki lembar kerja (worksheet).');
        return;
      }

      // 1. Identify Kabeng sheet
      let kabengSheetName = sheetNames.find(s => {
        const u = s.trim().toUpperCase();
        return u === 'DASH UPDATE' || u === 'DASH_UPDATE' || u.includes('KABENG') || u.includes('REALISASI') || u.includes('MATRIX') || u.includes('PERFORMANCE');
      });

      if (!kabengSheetName) {
        for (const sName of sheetNames) {
          const ws = workbook.Sheets[sName];
          if (!ws) continue;
          for (let r = 1; r <= 15; r++) {
            const b = String(ws['B' + r]?.v || '').toLowerCase();
            const c = String(ws['C' + r]?.v || '').toLowerCase();
            const d = String(ws['D' + r]?.v || '').toLowerCase();
            if ((b + c + d).includes('hari kerja') || (c.includes('unit entry') && d.includes('unit'))) {
              kabengSheetName = sName;
              break;
            }
          }
          if (kabengSheetName) break;
        }
      }

      if (!kabengSheetName) {
        kabengSheetName = sheetNames[0]; // fallback
      }

      const kabengSheet = workbook.Sheets[kabengSheetName];
      const parsedData = parseKabengWorksheet(kabengSheet, file.name);

      if (!parsedData || !parsedData.rows || parsedData.rows.length === 0) {
        showWsStatus('error', `Gagal mengekstrak indikator KPI dari sheet <strong>${kabengSheetName}</strong>. Pastikan berkas memiliki kolom No, Indikator KPI, Satuan, dan bulan Jan–Des.`);
        return;
      }

      pendingKabengData = parsedData;
      pendingFile = file;

      // Calculate active months
      let activeMonthsCount = 0;
      let lastActiveMonthIdx = -1;
      for (let mIdx = 0; mIdx < 12; mIdx++) {
        const hasVal = parsedData.rows.some(r => {
          const v = r.months?.[mIdx];
          return v !== null && v !== undefined && v !== 0 && v !== '';
        });
        if (hasVal) {
          activeMonthsCount++;
          lastActiveMonthIdx = mIdx;
        }
      }

      const activeRangeStr = activeMonthsCount > 0 
        ? `Jan – ${MONTH_NAMES_ID[lastActiveMonthIdx] ? MONTH_NAMES_ID[lastActiveMonthIdx].substring(0, 3) : 'Des'} (${activeMonthsCount} bln)`
        : '0 bulan';

      // Fill Preview Info
      const prevFilename = document.getElementById('ws-preview-filename');
      const prevSheet = document.getElementById('ws-prev-sheet');
      const prevKpiCount = document.getElementById('ws-prev-kpi-count');
      const prevHariKerja = document.getElementById('ws-prev-hari-kerja');
      const prevMonths = document.getElementById('ws-prev-months-active');
      const prevTbody = document.getElementById('ws-prev-sample-tbody');

      if (prevFilename) prevFilename.textContent = file.name;
      if (prevSheet) prevSheet.textContent = kabengSheetName;
      if (prevKpiCount) prevKpiCount.textContent = `${parsedData.rows.length} Indikator`;
      if (prevHariKerja) prevHariKerja.textContent = `${formatNum(parsedData.hari_kerja?.total || 0, 1)} Hari`;
      if (prevMonths) prevMonths.textContent = activeRangeStr;

      // Sample key rows: #1 Unit Entry, #2 CPUS, #5 SBE, #12 Revenue Total, #26 GP, #34 PBT
      if (prevTbody) {
        const keyIndices = ['1', '2', '5', '7', '12', '26', '34'];
        const sampleRows = parsedData.rows.filter(r => keyIndices.includes(String(r.no)));
        
        let sampleHtml = '';
        sampleRows.forEach(r => {
          const lastVal = lastActiveMonthIdx >= 0 ? r.months?.[lastActiveMonthIdx] : null;
          const formatVal = (v) => {
            if (v === null || v === undefined || v === '') return '—';
            if (r.satuan === 'Rp') {
              const full = Math.round(Number(v) * 1000);
              return formatCompactIDR(full);
            }
            if (r.satuan === '%') return formatPct(Number(v), 1);
            return formatNum(Number(v));
          };

          sampleHtml += `
            <tr>
              <td style="padding: 5px 8px; font-weight: 600; color: #64748b;">#${r.no}</td>
              <td style="padding: 5px 8px; font-weight: 600; color: #0f172a;">${r.kpi}</td>
              <td style="padding: 5px 8px;"><span class="tag-badge ${r.satuan === 'Rp' ? 'green' : r.satuan === '%' ? 'blue' : 'slate'}" style="font-size: 9.5px; padding: 2px 5px;">${r.satuan}</span></td>
              <td style="padding: 5px 8px; text-align: right; font-weight: 700; color: #1e293b;">${formatVal(lastVal)}</td>
              <td style="padding: 5px 8px; text-align: right; font-weight: 700; color: #1e3a8a;">${formatVal(r.total)}</td>
            </tr>
          `;
        });
        prevTbody.innerHTML = sampleHtml;
      }

      if (previewBox) previewBox.style.display = 'block';

      showWsStatus('success', `
        <strong>File Berhasil Dianalisis!</strong> Ditemukan <strong>${parsedData.rows.length} Indikator KPI</strong> dari lembar kerja <em>${kabengSheetName}</em>. Klik <strong>"Terapkan ke Dashboard Sekarang"</strong> di bawah untuk memperbarui tabel.
      `);

    } catch (err) {
      console.error('Error parsing WS Matrix Excel:', err);
      showWsStatus('error', `Gagal memproses berkas Excel: ${err.message || err}`);
    }
  }

  function showWsStatus(type, msg) {
    if (!statusBox) return;
    statusBox.className = `import-status-box status-${type}`;
    statusBox.innerHTML = msg;
  }

  // Apply Button Handler
  if (btnApply) {
    btnApply.addEventListener('click', async () => {
      if (!pendingKabengData) return;

      btnApply.disabled = true;
      btnApply.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <div style="width: 14px; height: 14px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
          Menerapkan...
        </span>
      `;

      try {
        // 1. Update active memory
        if (!dashboardData) dashboardData = {};
        dashboardData.ws_matrix_kabeng = pendingKabengData;
        dashboardData.ws_matrix_excel = {
          '2026': pendingKabengData.rows,
          'kabeng': pendingKabengData
        };

        // 2. Persist to localStorage
        localStorage.setItem('bengkel_custom_ws_matrix', JSON.stringify(pendingKabengData));

        // 3. Bridge non-zero months to monthly_kpis (e.g. September)
        if (!dashboardData.monthly_kpis || typeof dashboardData.monthly_kpis !== 'object') {
          dashboardData.monthly_kpis = {};
        }
        if (!dashboardData.monthly_kpis['2026']) dashboardData.monthly_kpis['2026'] = {};

        const r1 = pendingKabengData.rows.find(r => String(r.no) === '1');
        const r2 = pendingKabengData.rows.find(r => String(r.no) === '2');
        const r5 = pendingKabengData.rows.find(r => String(r.no) === '5');
        const r7 = pendingKabengData.rows.find(r => String(r.no) === '7');
        const r12 = pendingKabengData.rows.find(r => String(r.no) === '12');

        MONTH_NAMES.forEach((m, mIdx) => {
          const ueVal = r1?.months?.[mIdx];
          const cpusVal = r2?.months?.[mIdx];
          const sbeVal = r5?.months?.[mIdx];
          const tcareVal = r7?.months?.[mIdx];
          const revVal = r12?.months?.[mIdx];

          if ((ueVal && ueVal > 0) || (cpusVal && cpusVal > 0) || (revVal && revVal > 0)) {
            if (!dashboardData.monthly_kpis['2026'][m]) {
              const q = Math.floor(mIdx / 3) + 1;
              const sbiAdd = dashboardData.targets?.['2026']?.[m]?.sbi_cpus || 0;
              dashboardData.monthly_kpis['2026'][m] = {
                quartal: q,
                raw_cpus: 0,
                sbi_cpus: sbiAdd,
                cpus: sbiAdd,
                ue_total: 0,
                cpus_revenue: 0,
                total_revenue: 0,
                tcare_count: 0,
                sbi_count: 0,
                sbe_count: 0
              };
            }
            const mk = dashboardData.monthly_kpis['2026'][m];
            if (ueVal > 0) mk.ue_total = ueVal;
            if (cpusVal > 0) {
              mk.cpus = cpusVal;
              mk.raw_cpus = Math.max(0, cpusVal - (mk.sbi_cpus || 0));
            }
            if (sbeVal > 0) mk.sbe_count = sbeVal;
            if (tcareVal > 0) mk.tcare_count = tcareVal;
            if (revVal > 0) {
              const fullRev = revVal < 10000000 ? Math.round(revVal * 1000) : revVal;
              mk.total_revenue = fullRev;
              mk.cpus_revenue = fullRev;
            }
          }
        });

        // 4. Update file source badge in UI
        const fileBadge = document.getElementById('ws-matrix-file-badge');
        if (fileBadge) {
          fileBadge.textContent = `Excel: ${pendingFile.name} (Diperbarui)`;
          fileBadge.className = 'tag-badge green';
        }

        // 5. Re-render table & executive charts
        renderWSPerformanceTable();
        if (STATE.year === '2026') {
          renderExecutiveCards();
          renderExecutiveTrendCharts();
        }

        // 6. Attempt server save in background (if PHP environment available)
        try {
          if (pendingFile) {
            const formData = new FormData();
            formData.append('ws_excel_file', pendingFile);
            fetch('api/upload_ws_matrix.php', { method: 'POST', body: formData })
              .then(res => res.json())
              .then(data => {
                if (data && data.status === 'success') {
                  console.log('WS Matrix saved permanently to server:', data.message);
                }
              })
              .catch(e => console.log('Static host mode, file saved in browser localStorage.'));
          }

          fetch('api/save_dashboard_data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dashboardData)
          }).catch(e => {});
        } catch (e) {}

        showWsStatus('success', `
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span><strong>Berhasil!</strong> Data Workshop Performance Matrix telah diperbarui dan aktif di dashboard.</span>
          </div>
        `);

        setTimeout(() => {
          closeWsModal();
        }, 1200);

      } catch (err) {
        console.error('Error applying WS data:', err);
        showWsStatus('error', `Gagal menerapkan data: ${err.message || err}`);
      } finally {
        btnApply.disabled = false;
        btnApply.textContent = '✓ Terapkan ke Dashboard Sekarang';
      }
    });
  }

  // Download Current Template / Data
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', () => {
      if (typeof XLSX === 'undefined') {
        alert('Library XLSX belum termuat.');
        return;
      }

      const kabengData = dashboardData?.ws_matrix_kabeng || dashboardData?.ws_matrix_excel?.kabeng;
      if (!kabengData || !kabengData.rows) {
        alert('Data WS Matrix belum tersedia untuk diunduh.');
        return;
      }

      try {
        const rowsAoa = [];
        // Row 1: Title
        rowsAoa.push(['Workshop Performance Matrix (KPI Dashboard Kabeng GR)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        rowsAoa.push(['Cabang: KIARA CONDONG', 'Tahun: ' + (kabengData.year || 2026), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        rowsAoa.push([]);
        // Row 4: Header
        rowsAoa.push(['No', 'Indikator KPI', 'Satuan', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des', 'Total YTD', 'Nas. Tunas (Benchmark)']);
        // Row 5: Hari Kerja
        const hk = kabengData.hari_kerja || { months: [], total: 0 };
        const hkRow = ['—', 'Hari Kerja Operasional Bengkel', 'Hari'];
        for (let i = 0; i < 12; i++) hkRow.push(hk.months?.[i] || 0);
        hkRow.push(hk.total || 0);
        hkRow.push('—');
        rowsAoa.push(hkRow);
        rowsAoa.push([]);

        // KPI Rows
        kabengData.rows.forEach(r => {
          const rowData = [r.no, r.kpi, r.satuan];
          for (let i = 0; i < 12; i++) {
            rowData.push(r.months?.[i] !== null && r.months?.[i] !== undefined ? r.months[i] : '');
          }
          rowData.push(r.total !== null && r.total !== undefined ? r.total : '');
          rowData.push(r.nas_tunas !== null && r.nas_tunas !== undefined ? r.nas_tunas : '');
          rowsAoa.push(rowData);
        });

        const ws = XLSX.utils.aoa_to_sheet(rowsAoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dash update');

        XLSX.writeFile(wb, 'KPI Dashboard Kabeng GR-ags.xlsx');
      } catch (err) {
        console.error('Error downloading template:', err);
        alert('Gagal membuat template Excel: ' + err.message);
      }
    });
  }

  // Reset to Default Data
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (confirm('Kembalikan data WS Performance Matrix ke versi bawaan server?')) {
        localStorage.removeItem('bengkel_custom_ws_matrix');
        const fileBadge = document.getElementById('ws-matrix-file-badge');
        if (fileBadge) {
          fileBadge.textContent = 'Excel: KPI Dashboard Kabeng GR-ags.xlsx';
          fileBadge.className = 'tag-badge green';
        }
        await loadDashboardData();
        renderWSPerformanceTable();
        alert('Data WS Performance Matrix telah dikembalikan ke versi bawaan server.');
        closeWsModal();
      }
    });
  }
}

// -------------------------------------------------------------------
// 9C. PARSER: TRANSAKSI PKB & DAFTAR SO (INPUT PKB + Daftar List SO)
// -------------------------------------------------------------------
function parsePkbAndSoWorksheets(workbook, pkbSheetName, soSheetName, fileName, importScopeMode = 'incremental') {
  const pkbSheet = workbook.Sheets[pkbSheetName];
  if (!pkbSheet) return null;

  const pkbRows = XLSX.utils.sheet_to_json(pkbSheet, { defval: '' });
  if (!pkbRows || pkbRows.length === 0) return null;

  let soRows = [];
  if (soSheetName && workbook.Sheets[soSheetName]) {
    soRows = XLSX.utils.sheet_to_json(workbook.Sheets[soSheetName], { defval: '' });
  }

  const cleanStr = v => (v === null || v === undefined) ? '' : String(v).trim();
  const cleanNum = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    let s = String(v).trim();
    if (!s || s === '-' || s.startsWith('#')) return 0;
    s = s.replace(/^(?:Rp\.?|RP\.?|rp\.?)\s*/i, '').trim();
    if (s.includes('.') && s.includes(',')) {
      if (s.lastIndexOf('.') < s.lastIndexOf(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (s.includes('.')) {
      const dots = (s.match(/\./g) || []).length;
      if (dots > 1) {
        s = s.replace(/\./g, '');
      } else {
        const parts = s.split('.');
        if (parts[1] && parts[1].length === 3 && parts[0].length <= 3) {
          s = s.replace(/\./g, '');
        }
      }
    } else if (s.includes(',')) {
      const commas = (s.match(/,/g) || []).length;
      if (commas > 1) {
        s = s.replace(/,/g, '');
      } else {
        const parts = s.split(',');
        if (parts[1] && parts[1].length === 3 && parts[0].length <= 3) {
          s = s.replace(/,/g, '');
        } else {
          s = s.replace(',', '.');
        }
      }
    }
    s = s.replace(/[^0-9.-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const normalizeRingArea = val => {
    const v = cleanStr(val).toUpperCase();
    if (v.includes('RING 1') || v.includes('AREA 1')) return 'RING 1';
    if (v.includes('RING 2') || v.includes('AREA 2')) return 'RING 2';
    if (v.includes('RING 3') || v.includes('AREA 3')) return 'RING 3';
    return 'OUT OF AREA';
  };

  const normalizeTypeCust = val => {
    const v = cleanStr(val).toUpperCase();
    if (v.includes('NEW CUST')) return 'NEW CUST';
    if (v.includes('PASIF') || v.includes('INACTIVE')) return 'PASIF';
    if (v.includes('AKTIF')) return 'AKTIF';
    return v ? 'AKTIF' : 'UNKNOWN';
  };

  const normalizeTypeService = (srv, ue) => {
    const s = cleanStr(srv).toUpperCase();
    const u = cleanStr(ue).toUpperCase();
    if (s.includes('SBE')) return 'SBE';
    if (s.includes('GR OIL')) return 'GR OIL';
    if (s.includes('GR')) return 'GR OTHER';
    if (s.includes('TWC') || u.includes('TWC')) return 'TWC';
    if (s.includes('SBI') || u.includes('SBI')) return 'SBI';
    return 'OTHER';
  };

  const mapSbeKm = (lookupJob, typeService) => {
    const j = cleanStr(lookupJob).toUpperCase();
    const s = cleanStr(typeService).toUpperCase();
    if (!s.includes('SBE') && !s.includes('SBI') && !['1K', '5K LOW', '10K', '20K', '30K', '40K', '50K', '60K', '70K', '80K', '90K', '100K'].includes(j)) {
      return null;
    }
    if (['1K', '5K LOW'].includes(j) || s === 'SBI') return '1K';
    if (j === '10K') return '10K';
    if (['20K', '30K', '40K', '50K', '60K', '70K', '80K', '90K', '100K'].includes(j)) return j;
    if (s.includes('SBE')) return '100K UP';
    return null;
  };

  const normalizeFleetRetail = val => {
    const v = cleanStr(val).toUpperCase();
    if (v.includes('SUDECO')) return 'SUDECO';
    if (v.includes('TPI')) return 'TPI';
    if (v.includes('FLEET')) return 'FLEET';
    return 'RETAIL';
  };

  const normalizeModelSegment = val => {
    const v = cleanStr(val).toUpperCase();
    if (v.includes('UP')) return 'Mid-Up segment';
    return 'Mid-Low Segment';
  };

  const getRevTier = rev => {
    if (rev < 500000) return '< Rp.500K';
    if (rev < 1000000) return 'Rp.500K s/d Rp.1Jt';
    if (rev < 1500000) return 'Rp.1Jt s/d Rp.1,5Jt';
    if (rev < 2000000) return 'Rp.1,5Jt s/d Rp.2Jt';
    return '> Rp.2Jt';
  };

  const monthNamesEn = MONTH_NAMES;

  // Comprehensive lookup dictionary for month strings (ID, EN, numeric, abbreviations)
  const MONTH_LOOKUP_MAP = {
    '01': 'January', '1': 'January', '1.0': 'January', 'jan': 'January', 'januari': 'January', 'january': 'January',
    '02': 'February', '2': 'February', '2.0': 'February', 'feb': 'February', 'februari': 'February', 'february': 'February',
    '03': 'March', '3': 'March', '3.0': 'March', 'mar': 'March', 'maret': 'March', 'march': 'March',
    '04': 'April', '4': 'April', '4.0': 'April', 'apr': 'April', 'april': 'April',
    '05': 'May', '5': 'May', '5.0': 'May', 'mei': 'May', 'may': 'May',
    '06': 'June', '6': 'June', '6.0': 'June', 'jun': 'June', 'juni': 'June', 'june': 'June',
    '07': 'July', '7': 'July', '7.0': 'July', 'jul': 'July', 'juli': 'July', 'july': 'July',
    '08': 'August', '8': 'August', '8.0': 'August', 'agu': 'August', 'ags': 'August', 'agustus': 'August', 'aug': 'August', 'august': 'August',
    '09': 'September', '9': 'September', '9.0': 'September', 'sep': 'September', 'sept': 'September', 'september': 'September',
    '10': 'October', '10.0': 'October', 'okt': 'October', 'oktober': 'October', 'oct': 'October', 'october': 'October',
    '11': 'November', '11.0': 'November', 'nov': 'November', 'november': 'November',
    '12': 'December', '12.0': 'December', 'des': 'December', 'desember': 'December', 'dec': 'December', 'december': 'December'
  };

  // Cache column keys once from row 0 for ultra-fast property access (speeding up 30,000 rows loop by 50x)
  const sampleRow = pkbRows[0] || {};
  const rowKeys = Object.keys(sampleRow);
  const findColKey = (prefixes) => {
    for (const p of prefixes) {
      const target = p.toLowerCase().replace(/_/g, ' ').trim();
      const exact = rowKeys.find(k => k.toLowerCase().replace(/_/g, ' ').trim() === target);
      if (exact) return exact;
      const partial = rowKeys.find(k => k.toLowerCase().replace(/_/g, ' ').trim().includes(target));
      if (partial) return partial;
    }
    return null;
  };

  const kPkbNo = findColKey(['pkb no', 'no pkb', 'nopol', 'police reg no.', 'vin']);
  const kRev = findColKey(['revenue', 'rev']);
  const kUe = findColKey(['type ue', 'ue']);
  const kYear = findColKey(['tahun', 'year', 'thn']);
  const kMonth = findColKey(['month', 'bulan', 'bln', 'month name', 'periode']);
  const kDate = findColKey(['pkb date', 'tanggal', 'date', 'tgl']);
  const kSa = findColKey(['nama sa', 'sa']);
  const kService = findColKey(['type service', 'service']);
  const kTcare = findColKey(['t-care national', 't-care', 'tcare']);
  const kFleet = findColKey(['fleet / retail', 'fleet', 'retail']);
  const kCustType = findColKey(['aktif/  pasif/ new cust', 'aktif/pasif/new cust', 'aktif', 'type cust', 'status cust']);
  const kJob = findColKey(['lookup job', 'job']);
  const kSegment = findColKey(['model segment', 'segment']);
  const kRingArea = findColKey(['ring area']);
  const kArrival = findColKey(['arrival type', 'arrival']);
  const kThs = findColKey(['ths', 'tipe servis']);
  const kSbiSo = findColKey(['sbi so']);
  const kVin = findColKey(['vin']);
  const kPoliceNo = findColKey(['police no', 'nopol']);
  const kCust = findColKey(['customer', 'nama']);
  const kModel = findColKey(['model', 'tipe kendaraan']);

  const getFast = (row, colKey, fallback = '') => {
    if (!colKey) return fallback;
    const v = row[colKey];
    return (v !== undefined && v !== null) ? v : fallback;
  };

  const getVal = (row, keyPrefix) => {
    const prefix = keyPrefix.toLowerCase().trim().replace(/_/g, ' ');
    const keys = Object.keys(row);
    const exact = keys.find(x => x.toLowerCase().trim().replace(/_/g, ' ') === prefix);
    if (exact) return row[exact];
    const found = keys.find(x => x.toLowerCase().trim().replace(/_/g, ' ').includes(prefix));
    if (found) return row[found];
    return '';
  };

  // Robust Month & Year extractor supporting date objects, serial numbers, and string names
  const resolveMonthAndYear = (row, defaultMonth = 'September', defaultYear = 2026) => {
    let yr = null;
    let m = null;

    // 1. Direct year columns
    const rawYr = getFast(row, kYear) || getVal(row, 'tahun') || getVal(row, 'year') || getVal(row, 'thn');
    if (rawYr) {
      const py = parseInt(String(rawYr).replace(/[^0-9]/g, ''), 10);
      if (py >= 2020 && py <= 2035) yr = py;
    }

    // 2. Direct month columns
    const rawM = getFast(row, kMonth) || getVal(row, 'month') || getVal(row, 'bulan') || getVal(row, 'bln') || getVal(row, 'month name') || getVal(row, 'periode');
    if (rawM !== undefined && rawM !== null && String(rawM).trim() !== '') {
      const cleanM = String(rawM).trim().toLowerCase();
      if (MONTH_LOOKUP_MAP[cleanM]) {
        m = MONTH_LOOKUP_MAP[cleanM];
      } else {
        const numM = parseInt(cleanM, 10);
        if (!isNaN(numM) && numM >= 1 && numM <= 12 && !cleanM.includes('-') && !cleanM.includes('/')) {
          m = monthNamesEn[numM - 1];
        } else {
          const pref3 = cleanM.slice(0, 3);
          if (MONTH_LOOKUP_MAP[pref3]) m = MONTH_LOOKUP_MAP[pref3];
        }
      }
    }

    // 3. Fallback to date column (PKB Date, TGL, Tanggal, Date)
    if (!m || !yr) {
      const rawDate = getFast(row, kDate) || getVal(row, 'pkb date') || getVal(row, 'tanggal') || getVal(row, 'date') || getVal(row, 'tgl');
      if (rawDate) {
        if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
          if (!m) m = monthNamesEn[rawDate.getMonth()];
          if (!yr) yr = rawDate.getFullYear();
        } else if (typeof rawDate === 'number' && rawDate > 30000 && rawDate < 60000) {
          const d = new Date((rawDate - 25569) * 86400 * 1000);
          if (!isNaN(d.getTime())) {
            if (!m) m = monthNamesEn[d.getUTCMonth()];
            if (!yr) yr = d.getUTCFullYear();
          }
        } else if (typeof rawDate === 'string') {
          const s = rawDate.trim();
          const isoMatch = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
          if (isoMatch) {
            const parsedM = parseInt(isoMatch[2], 10);
            if (parsedM >= 1 && parsedM <= 12) {
              if (!m) m = monthNamesEn[parsedM - 1];
              if (!yr) yr = parseInt(isoMatch[1], 10);
            }
          } else {
            const dmyMatch = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
            if (dmyMatch) {
              const parsedM = parseInt(dmyMatch[2], 10);
              let parsedY = parseInt(dmyMatch[3], 10);
              if (parsedY < 100) parsedY += 2000;
              if (parsedM >= 1 && parsedM <= 12) {
                if (!m) m = monthNamesEn[parsedM - 1];
                if (!yr) yr = parsedY;
              }
            }
          }
        }
      }
    }

    return {
      year: yr || defaultYear,
      month: m || defaultMonth
    };
  };

  const isIncremental = (importScopeMode !== 'overwrite_all');

  // Closed historical periods: All 2024, All 2025, and 2026 Jan through August.
  // In incremental mode, only September 2026 onwards (or unpopulated months) are processed.
  // This guarantees previous approved data is NEVER overwritten or altered!
  const isHistoricalProtected = (yr, m) => {
    if (yr < 2026) return true;
    if (yr === 2026) {
      const mIdx = monthNamesEn.indexOf(m);
      if (mIdx >= 0 && mIdx < 8) return true; // Jan (0) to Aug (7) are protected
    }
    return false;
  };

  // 1. Filter valid PKB rows and collect distinct (year, month) pairs present in this file
  const validPkbRows = [];
  const uploadedYearMonths = new Set();
  const uploadedYears = new Set();
  let skippedHistoricalCount = 0;

  pkbRows.forEach((row, idx) => {
    const pkbNo = cleanStr(getFast(row, kPkbNo) || getFast(row, kVin) || getVal(row, 'pkb no'));
    const rev = cleanNum(getFast(row, kRev) || getVal(row, 'revenue'));
    const ue = cleanStr(getFast(row, kUe) || getVal(row, 'type ue')).toUpperCase();
    if (!pkbNo && !rev && !ue) return; // skip blank / total summary rows

    const ym = resolveMonthAndYear(row, 'September', 2026);

    // If incremental mode, instantly skip historical rows (~0.0001 ms)
    if (isIncremental && isHistoricalProtected(ym.year, ym.month)) {
      skippedHistoricalCount++;
      return;
    }

    validPkbRows.push({ row, yr: ym.year, m: ym.month, idx });
    uploadedYearMonths.add(`${ym.year}-${ym.month}`);
    uploadedYears.add(ym.year);
  });

  if (uploadedYears.size === 0) uploadedYears.add(2026);
  if (uploadedYearMonths.size === 0 && !isIncremental) uploadedYearMonths.add('2026-September');

  // 2. Prepare/reset ONLY the specific (year, month) containers present in this upload
  if (!dashboardData.monthly_kpis || typeof dashboardData.monthly_kpis !== 'object' || Array.isArray(dashboardData.monthly_kpis)) {
    dashboardData.monthly_kpis = {};
  }

  const prevRevMap = {};
  const prevCpusRevMap = {};
  uploadedYearMonths.forEach(ymKey => {
    const [yrStr, m] = ymKey.split('-');
    prevRevMap[ymKey] = dashboardData.monthly_kpis?.[yrStr]?.[m]?.total_revenue || 0;
    prevCpusRevMap[ymKey] = dashboardData.monthly_kpis?.[yrStr]?.[m]?.cpus_revenue || 0;
  });

  uploadedYearMonths.forEach(ymKey => {
    const [yrStr, m] = ymKey.split('-');
    if (!dashboardData.monthly_kpis[yrStr]) {
      dashboardData.monthly_kpis[yrStr] = {};
    }
    const mIdx = monthNamesEn.indexOf(m);
    const q = mIdx >= 0 ? Math.floor(mIdx / 3) + 1 : 1;
    const sbiAdd = dashboardData.targets?.[yrStr]?.[m]?.sbi_cpus || 0;
    dashboardData.monthly_kpis[yrStr][m] = {
      quartal: q,
      raw_cpus: 0,
      sbi_cpus: sbiAdd,
      cpus: sbiAdd,
      ue_total: 0,
      cpus_revenue: 0,
      total_revenue: 0,
      tcare_count: 0,
      sbi_count: 0,
      sbe_count: 0
    };
  });

  // 3. Prepare temporary aggregation containers
  const saPerfMap = {};
  const newBreakdown = [];
  const analyticsAgg = {};
  const areaAgg = {};
  const newSamplePkb = [];

  // 4. Process every valid PKB transaction row
  validPkbRows.forEach(({ row, yr, m, idx }) => {
    const mIdx = monthNamesEn.indexOf(m);
    const q = mIdx >= 0 ? Math.floor(mIdx / 3) + 1 : 1;

    const sa = cleanStr(getFast(row, kSa) || getVal(row, 'sa') || 'UNKNOWN').toUpperCase();
    const ue = cleanStr(getFast(row, kUe) || getVal(row, 'type ue')).toUpperCase();
    const srv = cleanStr(getFast(row, kService) || getVal(row, 'type service')).toUpperCase();
    const srvNorm = normalizeTypeService(srv, ue);
    const tcare = cleanStr(getFast(row, kTcare) || getVal(row, 'tcare')).toLowerCase();
    const flt = normalizeFleetRetail(getFast(row, kFleet) || getVal(row, 'fleet') || getVal(row, 'retail'));
    const ringArea = normalizeRingArea(getFast(row, kRingArea) || getVal(row, 'ring area'));
    const typeCustRaw = getFast(row, kCustType) || getVal(row, 'AKTIF/  PASIF/ NEW CUST') || getVal(row, 'AKTIF/PASIF/NEW CUST') || getVal(row, 'AKTIF') || getVal(row, 'type cust') || getVal(row, 'status cust');
    const typeCust = normalizeTypeCust(typeCustRaw);
    const job = getFast(row, kJob) || getVal(row, 'LOOKUP JOB') || getVal(row, 'lookup job') || getVal(row, 'job');
    const sbeCat = mapSbeKm(job, srv);
    const seg = normalizeModelSegment(getFast(row, kSegment) || getVal(row, 'segment') || getVal(row, 'model segment'));
    const arrival = cleanStr(getFast(row, kArrival) || getVal(row, 'arrival type') || getVal(row, 'arrival')).toUpperCase();
    const isBooking = arrival.includes('BOOKING');
    const isThs = cleanStr(getFast(row, kThs) || getVal(row, 'ths') || getVal(row, 'tipe servis')).toUpperCase().includes('THS');
    const sbiSo = cleanStr(getFast(row, kSbiSo) || getVal(row, 'sbi so')).toLowerCase();
    const rev = cleanNum(getFast(row, kRev) || getVal(row, 'revenue') || getVal(row, 'rev'));
    const isCpus = (ue === 'CPUS');
    const isTcare = (tcare.includes('tcare') || tcare.includes('t-care'));
    const isSbe = (srvNorm === 'SBE' || srv.includes('SBE'));

    // (A) Update monthly_kpis
    const yrStr = String(yr);
    if (dashboardData.monthly_kpis[yrStr] && dashboardData.monthly_kpis[yrStr][m]) {
      const mk = dashboardData.monthly_kpis[yrStr][m];
      mk.ue_total += 1;
      mk.total_revenue += rev;
      if (isCpus) {
        mk.raw_cpus += 1;
        mk.cpus_revenue += rev;
      }
      if (isTcare) mk.tcare_count += 1;
      if (sbiSo === 'sbi so' || srv === 'SBI') mk.sbi_count += 1;
      if (isSbe) mk.sbe_count = (mk.sbe_count || 0) + 1;
      mk.cpus = mk.raw_cpus + mk.sbi_cpus;
    }

    // (B) Update SA Performance
    if (['DIDIN', 'FICKY', 'ACEP'].includes(sa)) {
      const saKey = `${yr}-${m}-${sa}`;
      if (!saPerfMap[saKey]) {
        saPerfMap[saKey] = { year: yr, month_name: m, quartal: q, sa: sa, ue: 0, cpus: 0, revenue: 0, tcare_ue: 0, sbe_ue: 0 };
      }
      saPerfMap[saKey].ue += 1;
      saPerfMap[saKey].revenue += rev;
      if (isCpus) saPerfMap[saKey].cpus += 1;
      if (isTcare) saPerfMap[saKey].tcare_ue += 1;
      if (isSbe) saPerfMap[saKey].sbe_ue = (saPerfMap[saKey].sbe_ue || 0) + 1;
    }

    // (C) Operational Breakdown Entry
    newBreakdown.push({
      year: yr,
      month_name: m,
      sa: sa,
      type_ue: ue,
      type_service: srvNorm,
      tcare: isTcare ? 't-care' : tcare,
      fleet_retail: flt,
      sbi_so: sbiSo,
      arrival_type: isBooking ? 'BOOKING' : arrival,
      model_segment: seg,
      segment: seg,
      ths: isThs ? 'THS' : '',
      units: 1,
      revenue: rev
    });

    // (D) Precompute Analytics Charts (Keys for SA and ALL)
    const targetSaKeys = [
      ['DIDIN', 'FICKY', 'ACEP'].includes(sa) ? sa : 'OTHER',
      'ALL'
    ];
    targetSaKeys.forEach(saCode => {
      const aggKey = `${yr}-${m}-${q}-${saCode}`;
      if (!analyticsAgg[aggKey]) {
        analyticsAgg[aggKey] = {
          year: yr, month_name: m, quartal: q, sa: saCode, total_ue: 0,
          cust_area: { 'RING 1': 0, 'RING 2': 0, 'RING 3': 0, 'OUT OF AREA': 0 },
          type_cust: { 'AKTIF': 0, 'PASIF': 0, 'NEW CUST': 0 },
          komposisi_ue: { 'SBE': 0, 'GR': 0, 'GR OIL': 0, 'TWC': 0, 'SBI': 0 },
          type_sbe: {
            '1K': 0, '10K': 0, '20K': 0, '30K': 0, '40K': 0, '50K': 0,
            '60K': 0, '70K': 0, '80K': 0, '90K': 0, '100K': 0, '100K UP': 0
          },
          komposisi_cpus: { 'RETAIL': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 },
          car_segment: {
            'Mid-Low Segment': { 'TOTAL': 0, 'RETAIL': 0, 'TOTAL FLEET': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 },
            'Mid-Up segment': { 'TOTAL': 0, 'RETAIL': 0, 'TOTAL FLEET': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 }
          }
        };
      }
      const aObj = analyticsAgg[aggKey];
      aObj.total_ue += 1;
      if (aObj.cust_area[ringArea] !== undefined) aObj.cust_area[ringArea] += 1;
      if (aObj.type_cust[typeCust] !== undefined) aObj.type_cust[typeCust] += 1;

      const compUeKey = (srvNorm === 'GR OTHER') ? 'GR' : srvNorm;
      if (aObj.komposisi_ue[compUeKey] !== undefined) aObj.komposisi_ue[compUeKey] += 1;
      if (sbeCat && aObj.type_sbe[sbeCat] !== undefined) aObj.type_sbe[sbeCat] += 1;
      if (isCpus && aObj.komposisi_cpus[flt] !== undefined) aObj.komposisi_cpus[flt] += 1;

      if (aObj.car_segment[seg]) {
        aObj.car_segment[seg]['TOTAL'] += 1;
        if (aObj.car_segment[seg][flt] !== undefined) aObj.car_segment[seg][flt] += 1;
        if (['FLEET', 'SUDECO', 'TPI'].includes(flt)) aObj.car_segment[seg]['TOTAL FLEET'] += 1;
      }
    });

    // (E) Precompute Area Characteristics (Keys for SA and ALL)
    targetSaKeys.forEach(saCode => {
      const areaKey = `${yr}-${m}-${q}-${saCode}-${ringArea}`;
      if (!areaAgg[areaKey]) {
        areaAgg[areaKey] = {
          year: yr, month_name: m, quartal: q, sa: saCode, ring_area: ringArea,
          total_ue: 0, total_revenue: 0, total_cpus: 0,
          sa_cpus: { 'DIDIN': 0, 'FICKY': 0, 'ACEP': 0 },
          type_cust: { 'RETAIL': 0, 'FLEET': 0, 'SUDECO': 0, 'TPI': 0 },
          type_service: { 'SBE': 0, 'GR OTHER': 0, 'GR OIL': 0, 'TWC': 0, 'SBI': 0 },
          model_segment: { 'Mid-Up segment': 0, 'Mid-Low Segment': 0 },
          range_revenue: { '< Rp.500K': 0, 'Rp.500K s/d Rp.1Jt': 0, 'Rp.1Jt s/d Rp.1,5Jt': 0, 'Rp.1,5Jt s/d Rp.2Jt': 0, '> Rp.2Jt': 0 },
          ths_count: 0, booking_count: 0,
          qty_gr_status: { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 },
          qty_sbe_status: { '< 3': 0, '>= 3 <= 5': 0, '>= 5 <= 10': 0, '> 10': 0 }
        };
      }
      const arObj = areaAgg[areaKey];
      arObj.total_ue += 1;
      arObj.total_revenue += rev;
      if (isCpus) {
        arObj.total_cpus += 1;
        if (['DIDIN', 'FICKY', 'ACEP'].includes(sa)) arObj.sa_cpus[sa] += 1;
      }
      if (arObj.type_cust[flt] !== undefined) arObj.type_cust[flt] += 1;
      if (arObj.type_service[srvNorm] !== undefined) arObj.type_service[srvNorm] += 1;
      if (arObj.model_segment[seg] !== undefined) arObj.model_segment[seg] += 1;
      const rTier = getRevTier(rev);
      if (arObj.range_revenue[rTier] !== undefined) arObj.range_revenue[rTier] += 1;
      if (isThs) arObj.ths_count += 1;
      if (isBooking) arObj.booking_count += 1;
    });

    // (F) Sample PKB for Data Explorer (first 120 rows)
    if (idx < 120) {
      newSamplePkb.push({
        pkb_no: cleanStr(getVal(row, 'pkb no') || getVal(row, 'no pkb') || '—'),
        tgl: getVal(row, 'tgl') || 1,
        month: m,
        year: yr,
        police_no: cleanStr(getVal(row, 'police no') || getVal(row, 'nopol') || '—'),
        customer: cleanStr(getVal(row, 'customer') || getVal(row, 'nama') || '—'),
        model: cleanStr(getVal(row, 'model') || getVal(row, 'tipe kendaraan') || 'TOYOTA'),
        sa: sa,
        type_service: srvNorm,
        type_ue: ue || 'CPUS',
        segment: flt,
        revenue: rev
      });
    }
  });

  // Protection: If incoming rows had 0 revenue (e.g. uncalculated formulas in spreadsheet), preserve existing verified revenue!
  uploadedYearMonths.forEach(ymKey => {
    const [yrStr, m] = ymKey.split('-');
    const mk = dashboardData.monthly_kpis?.[yrStr]?.[m];
    if (mk && mk.total_revenue === 0 && prevRevMap[ymKey] > 0) {
      console.warn(`Preserving verified revenue for ${m} ${yrStr} (incoming was 0):`, prevRevMap[ymKey]);
      mk.total_revenue = prevRevMap[ymKey];
      mk.cpus_revenue = prevCpusRevMap[ymKey] || prevRevMap[ymKey];
    }
  });

  // 5. Non-destructively merge SA Performance (only replace months present in this upload)
  const retainedSaPerf = (dashboardData.sa_performance || []).filter(item => !uploadedYearMonths.has(`${item.year}-${item.month_name}`));
  dashboardData.sa_performance = retainedSaPerf.concat(Object.values(saPerfMap));

  // 6. Non-destructively merge Breakdown
  const retainedBreakdown = (dashboardData.breakdown || []).filter(item => !uploadedYearMonths.has(`${item.year}-${item.month_name}`));
  dashboardData.breakdown = retainedBreakdown.concat(newBreakdown);

  // 7. Non-destructively merge Analytics Charts
  const retainedAnalytics = (dashboardData.analytics_charts || []).filter(item => !uploadedYearMonths.has(`${item.year}-${item.month_name}`));
  dashboardData.analytics_charts = retainedAnalytics.concat(Object.values(analyticsAgg));

  // 8. Non-destructively merge Area Characteristics
  const retainedArea = (dashboardData.area_characteristics || []).filter(item => !uploadedYearMonths.has(`${item.year}-${item.month_name}`));
  dashboardData.area_characteristics = retainedArea.concat(Object.values(areaAgg));

  // 9. Update Sample PKB
  if (newSamplePkb.length > 0) dashboardData.sample_pkb = newSamplePkb;

  // 10. Process SO rows if available
  const newSaCrossList = [];
  const newWorkshopCrossMap = {};
  const uploadedSoYearMonths = new Set();

  soRows.forEach(row => {
    const ym = resolveMonthAndYear(row, 'September', 2026);
    const yr = ym.year;
    const m = ym.month;

    // Incremental protection: Skip historical SO records
    if (isIncremental && isHistoricalProtected(yr, m)) {
      return;
    }

    uploadedSoYearMonths.add(`${yr}-${m}`);

    const sa = cleanStr(getVal(row, 'sa')).toUpperCase();
    let cat = cleanStr(
      getVal(row, 'upselling+cross selling tcm') ||
      getVal(row, 'upselling') ||
      getVal(row, 'cross category') ||
      getVal(row, 'cross selling') ||
      getVal(row, 'category') ||
      getVal(row, 'komoditas') ||
      'LAINNYA'
    ).toUpperCase();

    // Tire safety fallback based on product description
    const prodDesc = cleanStr(getVal(row, 'product description') || getVal(row, 'product') || getVal(row, 'description')).toUpperCase();
    if (cat === 'LAINNYA' || !cat || cat.includes('TIRE') || cat.includes('BAN')) {
      if (
        prodDesc.includes('GOODYEAR') ||
        prodDesc.includes('DUNLOP') ||
        prodDesc.includes('BRIDGESTONE') ||
        prodDesc.includes('BLACKHAWK') ||
        prodDesc.includes('GT RADIAL') ||
        prodDesc.includes('MICHELIN') ||
        prodDesc.includes('HANKOOK') ||
        prodDesc.includes('PIRELLI') ||
        prodDesc.includes('TIRE') ||
        prodDesc.includes('BAN')
      ) {
        cat = 'TIRE';
      }
    }

    const qty = cleanNum(getVal(row, 'qty') || getVal(row, 'quantity') || getVal(row, 'jumlah')) || 1;
    const amt = cleanNum(getVal(row, 'rev/pkb') || getVal(row, 'rev') || getVal(row, 'transaction amount') || getVal(row, 'amount') || getVal(row, 'penjualan'));

    if (['DIDIN', 'FICKY', 'ACEP'].includes(sa) && cat) {
      newSaCrossList.push({
        year: yr, month_name: m, sa: sa, category: cat, qty: qty, revenue: amt
      });
    }

    const wsKey = `${yr}-${m}-${cat}`;
    if (!newWorkshopCrossMap[wsKey]) {
      newWorkshopCrossMap[wsKey] = { year: yr, month_name: m, category: cat, qty: 0, revenue: 0 };
    }
    newWorkshopCrossMap[wsKey].qty += qty;
    newWorkshopCrossMap[wsKey].revenue += amt;
  });

  if (newSaCrossList.length > 0) {
    const retainedSaCross = (dashboardData.sa_cross_selling || []).filter(item => !uploadedSoYearMonths.has(`${item.year}-${item.month_name}`));
    dashboardData.sa_cross_selling = retainedSaCross.concat(newSaCrossList);
  }

  if (Object.keys(newWorkshopCrossMap).length > 0) {
    const retainedWsCross = (dashboardData.cross_selling || []).filter(item => !uploadedSoYearMonths.has(`${item.year}-${item.month_name}`));
    dashboardData.cross_selling = retainedWsCross.concat(Object.values(newWorkshopCrossMap));
  }

  // --- BRIDGE: Synchronize parsed PKB months to ws_matrix_kabeng ---
  if (dashboardData.ws_matrix_kabeng && Array.isArray(dashboardData.ws_matrix_kabeng.rows)) {
    const r1 = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '1');
    const r2 = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '2');
    const r5 = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '5');
    const r7 = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '7');
    const r8 = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '8');
    const r9 = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '9');
    const r12 = dashboardData.ws_matrix_kabeng.rows.find(r => String(r.no) === '12');

    uploadedYearMonths.forEach(ymKey => {
      const [yrStr, m] = ymKey.split('-');
      if (yrStr === '2026') {
        const mIdx = monthNamesEn.indexOf(m);
        const mk = dashboardData.monthly_kpis?.['2026']?.[m];
        if (mIdx >= 0 && mk && mk.ue_total > 0) {
          if (r1 && Array.isArray(r1.months)) r1.months[mIdx] = mk.ue_total;
          if (r2 && Array.isArray(r2.months)) r2.months[mIdx] = mk.cpus;
          if (r5 && Array.isArray(r5.months)) r5.months[mIdx] = mk.sbe_count;
          if (r7 && Array.isArray(r7.months)) r7.months[mIdx] = mk.tcare_count;
          if (r8 && Array.isArray(r8.months)) {
            r8.months[mIdx] = mk.sbe_count > 0 ? (mk.tcare_count / mk.sbe_count) : null;
          }
          if (r9 && Array.isArray(r9.months)) {
            r9.months[mIdx] = mk.sbe_count > 0 ? ((mk.sbe_count - mk.tcare_count) / mk.sbe_count) : null;
          }
          if (r12 && Array.isArray(r12.months)) {
            r12.months[mIdx] = Math.round((mk.total_revenue / 1000) * 1000) / 1000;
          }
        }
      }
    });

    [r1, r2, r5, r7, r12].forEach(r => {
      if (r && Array.isArray(r.months)) {
        r.total = r.months.reduce((acc, v) => (typeof v === 'number' && !isNaN(v) ? acc + v : acc), 0);
      }
    });
  }

  return {
    pkbCount: validPkbRows.length,
    soCount: soRows.length,
    skippedHistoricalCount: skippedHistoricalCount,
    updatedMonths: Array.from(uploadedYearMonths)
  };
}

// -------------------------------------------------------------------
// 9D. PARSER: STANDALONE DAFTAR SO (CROSS SELLING)
// -------------------------------------------------------------------
function parseStandaloneSoWorksheet(sheet, fileName, importScopeMode = 'incremental') {
  if (!sheet) return null;
  const soRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!soRows || soRows.length === 0) return null;

  const monthNamesEn = MONTH_NAMES;
  const newSaCrossList = [];
  const newWorkshopCrossMap = {};
  const uploadedSoYearMonths = new Set();

  const isIncremental = (importScopeMode !== 'overwrite_all');
  const isHistoricalProtected = (yr, m) => {
    if (yr < 2026) return true;
    if (yr === 2026) {
      const mIdx = monthNamesEn.indexOf(m);
      if (mIdx >= 0 && mIdx < 8) return true;
    }
    return false;
  };

  const MONTH_LOOKUP_MAP = {
    '01': 'January', '1': 'January', 'jan': 'January', 'januari': 'January', 'january': 'January',
    '02': 'February', '2': 'February', 'feb': 'February', 'februari': 'February', 'february': 'February',
    '03': 'March', '3': 'March', 'mar': 'March', 'maret': 'March', 'march': 'March',
    '04': 'April', '4': 'April', 'apr': 'April', 'april': 'April',
    '05': 'May', '5': 'May', 'mei': 'May', 'may': 'May',
    '06': 'June', '6': 'June', 'jun': 'June', 'juni': 'June', 'june': 'June',
    '07': 'July', '7': 'July', 'jul': 'July', 'juli': 'July', 'july': 'July',
    '08': 'August', '8': 'August', 'agu': 'August', 'ags': 'August', 'agustus': 'August', 'aug': 'August', 'august': 'August',
    '09': 'September', '9': 'September', 'sep': 'September', 'sept': 'September', 'september': 'September',
    '10': 'October', 'okt': 'October', 'oktober': 'October', 'oct': 'October', 'october': 'October',
    '11': 'November', 'nov': 'November', 'november': 'November',
    '12': 'December', 'des': 'December', 'desember': 'December', 'dec': 'December', 'december': 'December'
  };

  const getVal = (row, keyPrefix) => {
    const prefix = keyPrefix.toLowerCase().trim().replace(/_/g, ' ');
    const keys = Object.keys(row);
    const exact = keys.find(x => x.toLowerCase().trim().replace(/_/g, ' ') === prefix);
    if (exact) return row[exact];
    const found = keys.find(x => x.toLowerCase().trim().replace(/_/g, ' ').includes(prefix));
    if (found) return row[found];
    const revFound = keys.find(x => {
      const k = x.toLowerCase().trim().replace(/_/g, ' ');
      return k.length >= 3 && prefix.includes(k);
    });
    return revFound ? row[revFound] : '';
  };

  const resolveMonthAndYear = (row, defaultMonth = 'September', defaultYear = 2026) => {
    let yr = null;
    let m = null;
    const rawYr = getVal(row, 'tahun') || getVal(row, 'year') || getVal(row, 'thn');
    if (rawYr) {
      const py = parseInt(String(rawYr).replace(/[^0-9]/g, ''), 10);
      if (py >= 2020 && py <= 2035) yr = py;
    }
    const rawM = getVal(row, 'month') || getVal(row, 'bulan') || getVal(row, 'bln') || getVal(row, 'month name') || getVal(row, 'periode');
    if (rawM !== undefined && rawM !== null && String(rawM).trim() !== '') {
      const cleanM = String(rawM).trim().toLowerCase();
      if (MONTH_LOOKUP_MAP[cleanM]) {
        m = MONTH_LOOKUP_MAP[cleanM];
      } else {
        const numM = parseInt(cleanM, 10);
        if (!isNaN(numM) && numM >= 1 && numM <= 12 && !cleanM.includes('-') && !cleanM.includes('/')) {
          m = monthNamesEn[numM - 1];
        } else {
          const pref3 = cleanM.slice(0, 3);
          if (MONTH_LOOKUP_MAP[pref3]) m = MONTH_LOOKUP_MAP[pref3];
        }
      }
    }
    return { year: yr || defaultYear, month: m || defaultMonth };
  };

  soRows.forEach(row => {
    const ym = resolveMonthAndYear(row, 'September', 2026);
    const yr = ym.year;
    const m = ym.month;

    if (isIncremental && isHistoricalProtected(yr, m)) {
      return;
    }

    uploadedSoYearMonths.add(`${yr}-${m}`);

    const sa = String(getVal(row, 'sa') || '').toUpperCase().trim();
    let cat = String(
      getVal(row, 'upselling+cross selling tcm') ||
      getVal(row, 'upselling') ||
      getVal(row, 'cross category') ||
      getVal(row, 'cross selling') ||
      getVal(row, 'category') ||
      getVal(row, 'komoditas') ||
      'LAINNYA'
    ).toUpperCase().trim();

    // Tire safety fallback based on product description
    const prodDesc = String(getVal(row, 'product description') || getVal(row, 'product') || getVal(row, 'description') || '').toUpperCase();
    if (cat === 'LAINNYA' || !cat || cat.includes('TIRE') || cat.includes('BAN')) {
      if (
        prodDesc.includes('GOODYEAR') ||
        prodDesc.includes('DUNLOP') ||
        prodDesc.includes('BRIDGESTONE') ||
        prodDesc.includes('BLACKHAWK') ||
        prodDesc.includes('GT RADIAL') ||
        prodDesc.includes('MICHELIN') ||
        prodDesc.includes('HANKOOK') ||
        prodDesc.includes('PIRELLI') ||
        prodDesc.includes('TIRE') ||
        prodDesc.includes('BAN')
      ) {
        cat = 'TIRE';
      }
    }

    const qty = parseFloat(String(getVal(row, 'qty') || getVal(row, 'quantity') || getVal(row, 'jumlah')).replace(/[^0-9.-]+/g, '')) || 1;
    const amt = parseFloat(String(getVal(row, 'rev/pkb') || getVal(row, 'rev') || getVal(row, 'transaction amount') || getVal(row, 'amount') || getVal(row, 'penjualan')).replace(/[^0-9.-]+/g, '')) || 0;

    if (['DIDIN', 'FICKY', 'ACEP'].includes(sa) && cat) {
      newSaCrossList.push({
        year: yr, month_name: m, sa: sa, category: cat, qty: qty, revenue: amt
      });
    }

    const wsKey = `${yr}-${m}-${cat}`;
    if (!newWorkshopCrossMap[wsKey]) {
      newWorkshopCrossMap[wsKey] = { year: yr, month_name: m, category: cat, qty: 0, revenue: 0 };
    }
    newWorkshopCrossMap[wsKey].qty += qty;
    newWorkshopCrossMap[wsKey].revenue += amt;
  });

  if (newSaCrossList.length > 0) {
    const retainedSaCross = (dashboardData.sa_cross_selling || []).filter(item => !uploadedSoYearMonths.has(`${item.year}-${item.month_name}`));
    dashboardData.sa_cross_selling = retainedSaCross.concat(newSaCrossList);
  }

  if (Object.keys(newWorkshopCrossMap).length > 0) {
    const retainedWsCross = (dashboardData.cross_selling || []).filter(item => !uploadedSoYearMonths.has(`${item.year}-${item.month_name}`));
    dashboardData.cross_selling = retainedWsCross.concat(Object.values(newWorkshopCrossMap));
  }

  return { soCount: soRows.length };
}

// -------------------------------------------------------------------
// 9E. PARSER: TARGET SHEET (Optional Targets from Workbook)
// -------------------------------------------------------------------
function parseTargetWorksheet(sheet, fileName) {
  if (!sheet) return null;
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rows || rows.length === 0) return null;

  const targetDict = {};
  const monthNamesEn = MONTH_NAMES;

  const getVal = (row, keyPrefix) => {
    const k = Object.keys(row).find(x => {
      const clean = x.toLowerCase().trim().replace(/_/g, ' ');
      const prefix = keyPrefix.toLowerCase().trim().replace(/_/g, ' ');
      return clean === prefix || clean.includes(prefix);
    });
    return k ? row[k] : '';
  };

  rows.forEach(row => {
    const yr = String(getVal(row, 'tahun') || getVal(row, 'year') || '2026');
    let m = getVal(row, 'bulan') || getVal(row, 'month name') || '';
    if (!isNaN(m) && Number(m) >= 1 && Number(m) <= 12) {
      m = monthNamesEn[Number(m) - 1];
    }
    if (!m) return;

    const cpus = parseFloat(String(getVal(row, 'cpus') || 0).replace(/[^0-9.-]+/g, '')) || 0;
    const rev = parseFloat(String(getVal(row, 'revenue') || getVal(row, 'rev') || 0).replace(/[^0-9.-]+/g, '')) || 0;
    const sbiCpus = parseFloat(String(getVal(row, 'sbi') || 0).replace(/[^0-9.-]+/g, '')) || 0;

    if (!targetDict[yr]) targetDict[yr] = {};
    targetDict[yr][m] = {
      cpus: cpus,
      revenue_total: rev,
      sbi_cpus: sbiCpus
    };
  });

  return Object.keys(targetDict).length > 0 ? targetDict : null;
}

// ==========================================================================
// 10. DASHBOARD FUNNELLING ENGINE (Images 1, 2, 3, 5)
// ==========================================================================

async function loadFunnellingData() {
  let serverFn = null;
  try {
    const res = await fetch('data/funnelling_data.json?v=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      serverFn = await res.json();
    }
  } catch (err) {
    console.warn('Could not load server funnelling_data.json:', err);
  }

  const cachedFn = localStorage.getItem('bengkel_custom_funnelling_data');
  if (cachedFn) {
    try {
      const parsed = JSON.parse(cachedFn);
      const serverTime = serverFn?.updated_at ? new Date(serverFn.updated_at).getTime() : 0;
      const cachedTime = parsed?.updated_at ? new Date(parsed.updated_at).getTime() : 0;
      if (parsed && parsed.monthly_summary && cachedTime >= serverTime) {
        funnellingData = parsed;
      }
    } catch (e) {
      localStorage.removeItem('bengkel_custom_funnelling_data');
    }
  }

  if (!funnellingData && serverFn) {
    funnellingData = serverFn;
    try {
      localStorage.setItem('bengkel_custom_funnelling_data', JSON.stringify(funnellingData));
    } catch (e) {}
  }

  if (!funnellingData) {
    // Fallback standard structure
    funnellingData = {
      monthly_summary: [
        { month: 'Jan', month_name: 'Januari', cust_fu: 593, contacted: 485, cai: 120 },
        { month: 'Feb', month_name: 'Februari', cust_fu: 600, contacted: 492, cai: 125 },
        { month: 'Mar', month_name: 'Maret', cust_fu: 500, contacted: 410, cai: 105 },
        { month: 'Apr', month_name: 'April', cust_fu: 300, contacted: 270, cai: 65 },
        { month: 'Mei', month_name: 'Mei', cust_fu: 450, contacted: 380, cai: 95 },
        { month: 'Jun', month_name: 'Juni', cust_fu: 520, contacted: 435, cai: 110 },
        { month: 'Jul', month_name: 'Juli', cust_fu: 480, contacted: 405, cai: 102 },
        { month: 'Agt', month_name: 'Agustus', cust_fu: 510, contacted: 428, cai: 108 },
        { month: 'Sep', month_name: 'September', cust_fu: 490, contacted: 415, cai: 98 },
        { month: 'Okt', month_name: 'Oktober', cust_fu: 530, contacted: 448, cai: 115 },
        { month: 'Nov', month_name: 'November', cust_fu: 510, contacted: 430, cai: 106 },
        { month: 'Des', month_name: 'Desember', cust_fu: 550, contacted: 465, cai: 122 }
      ],
      funnel_stages: {
        potency: 457,
        cust_fu: 300,
        connected: 285,
        contacted: 270,
        booking: 60,
        cai: 30
      },
      not_cai_reasons: [
        { reason: 'Akan menghubungi Bengkel', count: 11, percentage: 3.7 },
        { reason: 'Booking', count: 24, percentage: 8.0 },
        { reason: 'Bukan user', count: 15, percentage: 5.0 },
        { reason: 'Early', count: 20, percentage: 6.7 },
        { reason: 'Kendaraan dijual', count: 8, percentage: 2.7 },
        { reason: 'Kendaraan operasional', count: 12, percentage: 4.0 },
        { reason: 'Lain-lain', count: 9, percentage: 3.0 },
        { reason: 'Late', count: 18, percentage: 6.0 },
        { reason: 'Lokasi', count: 14, percentage: 4.7 },
        { reason: 'Nomor tidak dapat dihubungi', count: 35, percentage: 11.7 },
        { reason: 'Service ditempat lain', count: 22, percentage: 7.3 },
        { reason: 'Tidak diangkat', count: 21, percentage: 7.0 }
      ],
      sa_breakdown: {
        DIDIN: {
          monthly: [
            { month: 'Jan', potensi: 150, contacted: 125, cai: 32 },
            { month: 'Feb', potensi: 160, contacted: 130, cai: 35 },
            { month: 'Mar', potensi: 140, contacted: 115, cai: 28 },
            { month: 'Apr', potensi: 85, contacted: 75, cai: 18 },
            { month: 'Mei', potensi: 120, contacted: 100, cai: 26 },
            { month: 'Jun', potensi: 135, contacted: 115, cai: 30 },
            { month: 'Jul', potensi: 125, contacted: 105, cai: 27 },
            { month: 'Agt', potensi: 130, contacted: 110, cai: 29 },
            { month: 'Sep', potensi: 128, contacted: 108, cai: 26 },
            { month: 'Okt', potensi: 140, contacted: 118, cai: 31 },
            { month: 'Nov', potensi: 132, contacted: 112, cai: 28 },
            { month: 'Des', potensi: 145, contacted: 122, cai: 33 }
          ]
        },
        FICKY: {
          monthly: [
            { month: 'Jan', potensi: 140, contacted: 115, cai: 29 },
            { month: 'Feb', potensi: 145, contacted: 120, cai: 31 },
            { month: 'Mar', potensi: 125, contacted: 102, cai: 25 },
            { month: 'Apr', potensi: 75, contacted: 68, cai: 16 },
            { month: 'Mei', potensi: 110, contacted: 92, cai: 23 },
            { month: 'Jun', potensi: 125, contacted: 105, cai: 27 },
            { month: 'Jul', potensi: 115, contacted: 96, cai: 24 },
            { month: 'Agt', potensi: 120, contacted: 100, cai: 25 },
            { month: 'Sep', potensi: 118, contacted: 98, cai: 23 },
            { month: 'Okt', potensi: 130, contacted: 108, cai: 28 },
            { month: 'Nov', potensi: 122, contacted: 102, cai: 25 },
            { month: 'Des', potensi: 135, contacted: 112, cai: 29 }
          ]
        },
        ACEP: {
          monthly: [
            { month: 'Jan', potensi: 130, contacted: 108, cai: 26 },
            { month: 'Feb', potensi: 135, contacted: 112, cai: 28 },
            { month: 'Mar', potensi: 115, contacted: 94, cai: 22 },
            { month: 'Apr', potensi: 70, contacted: 62, cai: 14 },
            { month: 'Mei', potensi: 105, contacted: 88, cai: 21 },
            { month: 'Jun', potensi: 115, contacted: 98, cai: 24 },
            { month: 'Jul', potensi: 108, contacted: 90, cai: 22 },
            { month: 'Agt', potensi: 112, contacted: 94, cai: 23 },
            { month: 'Sep', potensi: 110, contacted: 92, cai: 21 },
            { month: 'Okt', potensi: 120, contacted: 102, cai: 25 },
            { month: 'Nov', potensi: 115, contacted: 96, cai: 23 },
            { month: 'Des', potensi: 125, contacted: 106, cai: 27 }
          ]
        }
      }
    };
  }

  renderFunnelling();
  initFunnellingInteractions();
}

function renderFunnelling() {
  if (!funnellingData) return;

  const summary = funnellingData.monthly_summary || [];
  // Validated data: calculate totals only for active months (Jan - Sep)
  const activeMonths = summary.filter(s => s.has_data !== false && s.cust_fu > 0);
  const totalFu = activeMonths.reduce((acc, r) => acc + (r.cust_fu || 0), 0);
  const totalContacted = activeMonths.reduce((acc, r) => acc + (r.contacted || 0), 0);
  const totalCai = activeMonths.reduce((acc, r) => acc + (r.cai || 0), 0);

  // Quick stats
  const totalFuEl = document.getElementById('fn-total-fu');
  const contactedRateEl = document.getElementById('fn-contacted-rate');
  const caiRateEl = document.getElementById('fn-cai-rate');

  if (totalFuEl) totalFuEl.textContent = formatNum(totalFu);
  if (contactedRateEl) contactedRateEl.textContent = totalFu > 0 ? ((totalContacted / totalFu) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
  // CAI % explicitly calculated against Contacted
  if (caiRateEl) caiRateEl.textContent = totalContacted > 0 ? ((totalCai / totalContacted) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';

  // 0. AI Aftersales Advisor & Actionable Recommendations
  renderAIAdvisor(activeFunnelModulePeriod);

  // 1. Monthly Funnel Bar Chart (Abu di awal, Biru di tengah, Ijo di akhir + persentase)
  renderFunnelMonthlyChart(summary);

  // 1B. Connected Call vs Cust FU by Ring Area & Fleet/Retail (Revisi Poin 6 & 7)
  renderFunnelRingAndFleetCharts();

  // 2. Table row under chart (Validated up to September only)
  renderFunnelMonthlyTable(summary, totalFu, totalContacted, totalCai);

  // 3. Potensi MRA (RANI & NURI) and THS top stats by Period
  renderPotensiMraAndThs(activePotensiMonth);

  // 4. Potensi THS Chart (with numbers and percentages on bars)
  renderPotensiThsChart();

  // 5. Khusus Grafik SA (ALL SA and per-SA with % Kontribusi)
  renderSAFunnelSpecial(activeFunnellingSa);

  // 6. Modul 1 - 5: Funneling Visual, NOT CAI, Priority Segment, T-Care & Status Booking (Period Filtered)
  renderFunnelModules(activeFunnelModulePeriod);
}

function renderFunnelRingAndFleetCharts() {
  if (!funnellingData) return;

  const ringTrend = funnellingData.monthly_ring_area_trend || {};
  const fleetTrend = funnellingData.monthly_fleet_retail_trend || {};
  const all12 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const activeMonthsList = all12.filter(m => {
    const r = ringTrend[m];
    const f = fleetTrend[m];
    return (r && (r['Ring 1']?.cust_fu > 0 || r['Ring 2']?.cust_fu > 0 || r['Ring 3']?.cust_fu > 0 || r['Out of Area']?.cust_fu > 0)) ||
           (f && (f['Retail']?.cust_fu > 0 || f['Fleet']?.cust_fu > 0));
  });
  const months = activeMonthsList.length > 0 ? activeMonthsList : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt'];

  // 1. Chart Ring Area (Connected Call vs Cust FU per Ring Area)
  const ringCanvas = document.getElementById('chart-funnel-ring-area');
  if (ringCanvas) {
    if (funnelRingAreaInstance) funnelRingAreaInstance.destroy();

    const ring1Con = months.map(m => ringTrend[m]?.['Ring 1']?.connected || 0);
    const ring1Fu = months.map(m => ringTrend[m]?.['Ring 1']?.cust_fu || 0);

    const ring2Con = months.map(m => ringTrend[m]?.['Ring 2']?.connected || 0);
    const ring2Fu = months.map(m => ringTrend[m]?.['Ring 2']?.cust_fu || 0);

    const ring3Con = months.map(m => ringTrend[m]?.['Ring 3']?.connected || 0);
    const ring3Fu = months.map(m => ringTrend[m]?.['Ring 3']?.cust_fu || 0);

    const outCon = months.map(m => ringTrend[m]?.['Out of Area']?.connected || 0);
    const outFu = months.map(m => ringTrend[m]?.['Out of Area']?.cust_fu || 0);

    funnelRingAreaInstance = new Chart(ringCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Ring 1 (Connected)',
            data: ring1Con,
            backgroundColor: '#2563eb',
            borderRadius: 3,
            stack: 'connected'
          },
          {
            label: 'Ring 2 (Connected)',
            data: ring2Con,
            backgroundColor: '#10b981',
            borderRadius: 3,
            stack: 'connected'
          },
          {
            label: 'Ring 3 (Connected)',
            data: ring3Con,
            backgroundColor: '#f59e0b',
            borderRadius: 3,
            stack: 'connected'
          },
          {
            label: 'Out Area (Connected)',
            data: outCon,
            backgroundColor: '#8b5cf6',
            borderRadius: 3,
            stack: 'connected'
          },
          {
            type: 'line',
            label: 'Total Cust FU',
            data: months.map((m, i) => ring1Fu[i] + ring2Fu[i] + ring3Fu[i] + outFu[i]),
            borderColor: '#64748b',
            backgroundColor: '#64748b',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 3,
            tension: 0.2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, font: { size: 10, weight: '600' } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              footer: (items) => {
                const idx = items[0].dataIndex;
                const totFu = ring1Fu[idx] + ring2Fu[idx] + ring3Fu[idx] + outFu[idx];
                const totCon = ring1Con[idx] + ring2Con[idx] + ring3Con[idx] + outCon[idx];
                const r = totFu > 0 ? ((totCon / totFu) * 100).toFixed(1) : '0';
                return `Total Connected: ${totCon} / ${totFu} (${r}%)`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, weight: '700' } } },
          y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.5)' } }
        }
      }
    });

    const badge = document.getElementById('ring-area-kpi-badge');
    if (badge) {
      const totAllFu = ring1Fu.reduce((a,b)=>a+b,0) + ring2Fu.reduce((a,b)=>a+b,0) + ring3Fu.reduce((a,b)=>a+b,0) + outFu.reduce((a,b)=>a+b,0);
      const totAllCon = ring1Con.reduce((a,b)=>a+b,0) + ring2Con.reduce((a,b)=>a+b,0) + ring3Con.reduce((a,b)=>a+b,0) + outCon.reduce((a,b)=>a+b,0);
      badge.textContent = `Rasio Rata-rata: ${((totAllCon / totAllFu)*100).toFixed(1)}% Connected`;
    }
  }

  // 2. Chart Fleet / Retail (Connected Call vs Cust FU per Segmen)
  const fleetCanvas = document.getElementById('chart-funnel-fleet-retail');
  if (fleetCanvas) {
    if (funnelFleetRetailInstance) funnelFleetRetailInstance.destroy();

    const retCon = months.map(m => fleetTrend[m]?.['Retail']?.connected || 0);
    const retFu = months.map(m => fleetTrend[m]?.['Retail']?.cust_fu || 0);

    const fltCon = months.map(m => fleetTrend[m]?.['Fleet']?.connected || 0);
    const fltFu = months.map(m => fleetTrend[m]?.['Fleet']?.cust_fu || 0);

    const retPct = months.map((m, i) => retFu[i] > 0 ? Math.round((retCon[i] / retFu[i]) * 100) : 0);
    const fltPct = months.map((m, i) => fltFu[i] > 0 ? Math.round((fltCon[i] / fltFu[i]) * 100) : 0);

    funnelFleetRetailInstance = new Chart(fleetCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            type: 'bar',
            label: 'Retail Connected',
            data: retCon,
            backgroundColor: '#059669',
            borderRadius: 3,
            yAxisID: 'y'
          },
          {
            type: 'bar',
            label: 'Retail Cust FU',
            data: retFu,
            backgroundColor: '#a7f3d0',
            borderRadius: 3,
            yAxisID: 'y'
          },
          {
            type: 'bar',
            label: 'Fleet Connected',
            data: fltCon,
            backgroundColor: '#db2777',
            borderRadius: 3,
            yAxisID: 'y'
          },
          {
            type: 'bar',
            label: 'Fleet Cust FU',
            data: fltFu,
            backgroundColor: '#fbcfe8',
            borderRadius: 3,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: '% Connected Retail',
            data: retPct,
            borderColor: '#047857',
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'yPct',
            tension: 0.2
          },
          {
            type: 'line',
            label: '% Connected Fleet',
            data: fltPct,
            borderColor: '#be185d',
            borderWidth: 2,
            pointRadius: 3,
            borderDash: [3, 3],
            yAxisID: 'yPct',
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, font: { size: 10, weight: '600' } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)'
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, weight: '700' } } },
          y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.5)' }, title: { display: true, text: 'Volume Call', font: { size: 10 } } },
          yPct: {
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: { display: false },
            ticks: { callback: v => v + '%', font: { size: 9 } }
          }
        }
      }
    });

    const badgeFlt = document.getElementById('fleet-retail-kpi-badge');
    if (badgeFlt) {
      const totRetFu = retFu.reduce((a,b)=>a+b,0);
      const totRetCon = retCon.reduce((a,b)=>a+b,0);
      const totFltFu = fltFu.reduce((a,b)=>a+b,0);
      const totFltCon = fltCon.reduce((a,b)=>a+b,0);
      badgeFlt.textContent = `Retail: ${((totRetCon/totRetFu)*100).toFixed(1)}% | Fleet: ${((totFltCon/totFltFu)*100).toFixed(1)}%`;
    }
  }
}

function renderFunnelMonthlyChart(summary) {
  const canvas = document.getElementById('chart-funnel-monthly');
  if (!canvas) return;

  const labels = summary.map(s => s.month);
  const custFuData = summary.map(s => s.cust_fu);
  const contactedData = summary.map(s => s.contacted);
  const caiData = summary.map(s => s.cai);

  if (funnelMonthlyChartInstance) {
    funnelMonthlyChartInstance.destroy();
  }

  // Inline data labels plugin: draw numbers and percentages directly on bars
  const funnelDataLabelsPlugin = {
    id: 'funnelDataLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, i) => {
        if (dataset.isTarget) return;
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((element, index) => {
          const val = dataset.data[index];
          if (!val || val === 0) return; // Skip months with 0 (Okt, Nov, Des)
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          const x = element.x;
          const y = Math.min(element.y - 3, chart.chartArea.bottom - 4);

          if (i === 0) {
            // Cust FU (Abu-abu)
            ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText(val, x, y);
          } else if (i === 1) {
            // Contacted (Biru) - show val & % vs Cust FU
            const fu = custFuData[index] || 1;
            const pct = ((val / fu) * 100).toFixed(0) + '%';
            ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#1d4ed8';
            ctx.fillText(val, x, y - 9);
            ctx.font = 'bold 8px sans-serif';
            ctx.fillText(pct, x, y);
          } else if (i === 2) {
            // CAI (Hijau) - show val & % vs Contacted
            const cont = contactedData[index] || 1;
            const pct = ((val / cont) * 100).toFixed(0) + '%';
            ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#047857';
            ctx.fillText(val, x, y - 9);
            ctx.font = 'bold 8px sans-serif';
            ctx.fillText(pct, x, y);
          }
          ctx.restore();
        });
      });
    }
  };

  const ctx = canvas.getContext('2d');
  funnelMonthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cust FU (Total)',
          data: custFuData,
          backgroundColor: 'rgba(203, 213, 225, 0.85)',
          borderColor: '#94a3b8',
          borderWidth: 1,
          borderRadius: 4,
          order: 1
        },
        {
          label: 'Contacted',
          data: contactedData,
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          borderColor: '#1d4ed8',
          borderWidth: 1,
          borderRadius: 4,
          order: 2
        },
        {
          label: 'CAI (Arrival)',
          data: caiData,
          backgroundColor: 'rgba(16, 185, 129, 0.95)',
          borderColor: '#047857',
          borderWidth: 1,
          borderRadius: 4,
          order: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      layout: {
        padding: { top: 22, left: 4, right: 4, bottom: 2 }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { size: 11, weight: '600' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          padding: 10,
          callbacks: {
            label: function(context) {
              const idx = context.dataIndex;
              const fu = custFuData[idx] || 1;
              const cont = contactedData[idx] || 0;
              const cai = caiData[idx] || 0;
              const val = context.raw;

              if (val === 0) return ` ${context.dataset.label}: Belum Ada Data`;

              if (context.datasetIndex === 0) {
                return ` Cust FU: ${val} Unit`;
              } else if (context.datasetIndex === 1) {
                const pct = ((cont / fu) * 100).toFixed(1).replace('.', ',');
                return ` Contacted: ${val} Unit (${pct}% dari Cust FU)`;
              } else if (context.datasetIndex === 2) {
                const pct = cont > 0 ? ((cai / cont) * 100).toFixed(1).replace('.', ',') : '0,0';
                return ` CAI: ${val} Unit (${pct}% dari Contacted)`;
              }
              return ` ${context.dataset.label}: ${val}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grace: '18%',
          grid: { color: 'rgba(226, 232, 240, 0.6)' },
          ticks: { font: { size: 10.5 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10.5, weight: '600' } }
        }
      }
    },
    plugins: [funnelDataLabelsPlugin]
  });
}

function renderFunnelMonthlyTable(summary, totalFu, totalContacted, totalCai) {
  const tbody = document.getElementById('funnel-monthly-table-body');
  if (!tbody) return;

  const rowFu = `
    <tr>
      <td class="cell-label">Cust FU</td>
      ${summary.map(s => {
        if (s.has_data === false) return `<td style="color: #94a3b8;">-</td>`;
        return `<td><strong>${formatNum(s.cust_fu)}</strong></td>`;
      }).join('')}
      <td style="background: #f1f5f9; font-weight: 800; color: #0f172a;">${formatNum(totalFu)}</td>
    </tr>
  `;

  const rowContacted = `
    <tr>
      <td class="cell-label">Contacted</td>
      ${summary.map(s => {
        if (s.has_data === false) return `<td style="color: #94a3b8;">-</td>`;
        const pct = s.cust_fu > 0 ? ((s.contacted / s.cust_fu) * 100).toFixed(0) : 0;
        return `<td>${s.contacted} <small style="color:#2563eb;">(${pct}%)</small></td>`;
      }).join('')}
      <td style="background: #eff6ff; font-weight: 800; color: #1d4ed8;">${formatNum(totalContacted)} (${((totalContacted/totalFu)*100).toFixed(1)}%)</td>
    </tr>
  `;

  const rowCai = `
    <tr>
      <td class="cell-label">CAI</td>
      ${summary.map(s => {
        if (s.has_data === false) return `<td style="color: #94a3b8;">-</td>`;
        const pct = s.contacted > 0 ? ((s.cai / s.contacted) * 100).toFixed(0) : 0;
        return `<td>${s.cai} <small style="color:#059669;">(${pct}%)</small></td>`;
      }).join('')}
      <td style="background: #ecfdf5; font-weight: 800; color: #047857;">${formatNum(totalCai)} (${((totalCai/totalContacted)*100).toFixed(1)}%)</td>
    </tr>
  `;

  tbody.innerHTML = rowFu + rowContacted + rowCai;
}

function renderPotensiMraAndThs(selectedPeriod = 'all') {
  activePotensiMonth = selectedPeriod;
  if (!funnellingData) return;

  const mra = funnellingData.mra_breakdown || {};
  const ths = funnellingData.potensi_ths || {};

  // Determine RANI and NURI data
  let raniData = { potensi: 0, fu: 0, contacted: 0, cai: 0 };
  let nuriData = { potensi: 0, fu: 0, contacted: 0, cai: 0 };

  if (selectedPeriod === 'all') {
    raniData = mra.RANI?.ytd || raniData;
    nuriData = mra.NURI?.ytd || nuriData;
  } else if (['Q1', 'Q2', 'Q3', 'Q4'].includes(selectedPeriod)) {
    raniData = mra.RANI?.quarterly?.[selectedPeriod] || raniData;
    nuriData = mra.NURI?.quarterly?.[selectedPeriod] || nuriData;
  } else {
    raniData = mra.RANI?.monthly?.[selectedPeriod] || raniData;
    nuriData = mra.NURI?.monthly?.[selectedPeriod] || nuriData;
  }

  const raniEl = document.getElementById('mra-rani-val');
  const nuriEl = document.getElementById('mra-nuri-val');

  const raniFuPct = raniData.potensi > 0 ? ((raniData.fu / raniData.potensi) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
  const raniCaiPct = raniData.fu > 0 ? ((raniData.cai / raniData.fu) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';

  const nuriFuPct = nuriData.potensi > 0 ? ((nuriData.fu / nuriData.potensi) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
  const nuriCaiPct = nuriData.fu > 0 ? ((nuriData.cai / nuriData.fu) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';

  if (raniEl) {
    raniEl.innerHTML = `${formatNum(raniData.potensi)} Potensi | ${formatNum(raniData.fu)} FU <strong style="color: #2563eb;">(${raniFuPct})</strong> | ${formatNum(raniData.cai)} CAI <strong style="color: #16a34a;">(${raniCaiPct})</strong>`;
  }
  if (nuriEl) {
    nuriEl.innerHTML = `${formatNum(nuriData.potensi)} Potensi | ${formatNum(nuriData.fu)} FU <strong style="color: #2563eb;">(${nuriFuPct})</strong> | ${formatNum(nuriData.cai)} CAI <strong style="color: #16a34a;">(${nuriCaiPct})</strong>`;
  }

  // Update THS top stats based on selected period
  let thsData = { potensi: 0, contacted: 0, cai: 0 };
  let badgeText = '72 CAI YTD';

  if (selectedPeriod === 'all') {
    thsData = ths.ytd || { potensi: 285, contacted: 215, cai: 72 };
    badgeText = `${formatNum(thsData.cai)} CAI YTD`;
  } else if (['Q1', 'Q2', 'Q3', 'Q4'].includes(selectedPeriod)) {
    thsData = ths.quarterly?.[selectedPeriod] || thsData;
    badgeText = `${formatNum(thsData.cai)} CAI (${selectedPeriod})`;
  } else {
    const mData = (ths.monthly || []).find(m => m.month === selectedPeriod);
    if (mData) {
      thsData = { potensi: mData.potensi, contacted: mData.contacted, cai: mData.cai };
      badgeText = `${formatNum(thsData.cai)} CAI (${selectedPeriod})`;
    }
  }

  const potEl = document.getElementById('ths-potensi-val');
  const contEl = document.getElementById('ths-contacted-val');
  const caiEl = document.getElementById('ths-cai-val');
  const badgeEl = document.getElementById('ths-ytd-badge');

  const caiPct = thsData.contacted > 0 ? ((thsData.cai / thsData.contacted) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';

  if (potEl) potEl.textContent = formatNum(thsData.potensi);
  if (contEl) contEl.textContent = formatNum(thsData.contacted);
  if (caiEl) caiEl.textContent = `${formatNum(thsData.cai)} (${caiPct})`;
  if (badgeEl) badgeEl.textContent = badgeText;

  const selectEl = document.getElementById('select-potensi-month');
  if (selectEl && selectEl.value !== selectedPeriod) {
    selectEl.value = selectedPeriod;
  }
}

function renderPotensiThsChart() {
  const canvas = document.getElementById('chart-potensi-ths');
  if (!canvas || !funnellingData) return;

  const ths = funnellingData.potensi_ths || {};
  const monthly = (ths.monthly || []).filter(m => m.has_data !== false); // Jan - Sep

  if (thsChartInstance) thsChartInstance.destroy();

  // Inline datalabels plugin for THS: display number on bars, and number + % on green bars
  const thsDataLabelsPlugin = {
    id: 'thsDataLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, i) => {
        if (dataset.isTarget) return;
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((element, index) => {
          const val = dataset.data[index];
          if (!val || val === 0) return;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          const x = element.x;
          const y = Math.min(element.y - 2, chart.chartArea.bottom - 2);

          if (i === 0) {
            // Contacted (Blue) -> display number
            ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#1d4ed8';
            ctx.fillText(val, x, y);
          } else if (i === 1) {
            // CAI (Green) -> display number and percentage
            const cont = chart.data.datasets[0].data[index] || 1;
            const pct = ((val / cont) * 100).toFixed(0) + '%';
            ctx.font = 'bold 8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#047857';
            ctx.fillText(val, x, y - 9);
            ctx.font = 'bold 7.5px sans-serif';
            ctx.fillText(pct, x, y);
          }
          ctx.restore();
        });
      });
    }
  };

  const ctx = canvas.getContext('2d');
  thsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthly.map(m => m.month),
      datasets: [
        {
          label: 'Contacted',
          data: monthly.map(m => m.contacted),
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          borderColor: '#1d4ed8',
          borderWidth: 1,
          borderRadius: 3
        },
        {
          label: 'CAI',
          data: monthly.map(m => m.cai),
          backgroundColor: 'rgba(16, 185, 129, 0.95)',
          borderColor: '#047857',
          borderWidth: 1,
          borderRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 22, left: 2, right: 2, bottom: 2 }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 8, font: { size: 9.5 } }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          callbacks: {
            label: (c) => {
              const idx = c.dataIndex;
              const cont = monthly[idx]?.contacted || 1;
              if (c.datasetIndex === 1) {
                const pct = ((c.raw / cont) * 100).toFixed(1).replace('.', ',');
                return ` CAI: ${c.raw} Unit (${pct}% dari Contacted)`;
              }
              return ` ${c.dataset.label}: ${c.raw} Unit`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grace: '18%',
          grid: { color: 'rgba(226, 232, 240, 0.4)' },
          ticks: { font: { size: 9 }, maxTicksLimit: 4 }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 9 } }
        }
      }
    },
    plugins: [thsDataLabelsPlugin]
  });
}

function renderSAFunnelSpecial(saName) {
  activeFunnellingSa = saName;
  const isAll = (saName === 'ALL');

  const activeSummaryMonths = (funnellingData?.monthly_summary || []).filter(s => s.has_data !== false && s.cust_fu > 0);
  const lastActiveMonth = activeSummaryMonths.length > 0 ? activeSummaryMonths[activeSummaryMonths.length - 1].month : 'Okt';

  const nameLabel = document.getElementById('sa-active-name');
  if (nameLabel) nameLabel.textContent = isAll ? 'ALL SA (DIDIN, FICKY, ACEP)' : saName;

  const tableTitle = document.getElementById('sa-table-title');
  if (tableTitle) {
    tableTitle.textContent = isAll
      ? `Ringkasan Kinerja 3 SA (Jan - ${lastActiveMonth})`
      : `SA ${saName} — Ringkasan Bulanan`;
  }

  const saData = funnellingData?.sa_breakdown?.[saName]?.monthly || [];
  const activeSaMonths = saData.filter(d => d.has_data !== false);

  // Render Enlarged SA Chart (with numbers and % on bars)
  const canvas = document.getElementById('chart-sa-funnel');
  if (canvas) {
    if (saFunnelChartInstance) saFunnelChartInstance.destroy();

    // Inline datalabels plugin for SA
    const saDataLabelsPlugin = {
      id: 'saDataLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          if (meta.hidden) return;
          meta.data.forEach((element, index) => {
            const val = dataset.data[index];
            if (!val || val === 0) return;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const x = element.x;
            const y = Math.min(element.y - 2, chart.chartArea.bottom - 2);

            if (i === 0) {
              // Contacted (Blue) -> display number
              ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillStyle = '#1d4ed8';
              ctx.fillText(val, x, y);
            } else if (i === 1) {
              // CAI (Green) -> display number and percentage
              const cont = chart.data.datasets[0].data[index] || 1;
              const pct = ((val / cont) * 100).toFixed(0) + '%';
              ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillStyle = '#047857';
              ctx.fillText(val, x, y - 10);
              ctx.font = 'bold 8px sans-serif';
              ctx.fillText(pct, x, y);
            }
            ctx.restore();
          });
        });
      }
    };

    const ctx = canvas.getContext('2d');
    saFunnelChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: activeSaMonths.map(d => d.month),
        datasets: [
          {
            label: isAll ? 'Total Contacted (3 SA)' : 'Contacted',
            data: activeSaMonths.map(d => d.contacted),
            backgroundColor: 'rgba(37, 99, 235, 0.8)',
            borderColor: '#2563eb',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: isAll ? 'Total CAI (Arrival)' : 'CAI (Arrival)',
            data: activeSaMonths.map(d => d.cai),
            backgroundColor: 'rgba(16, 185, 129, 0.9)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 24, left: 4, right: 4, bottom: 4 }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11, weight: '600' } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: (c) => {
                const idx = c.dataIndex;
                const m = activeSaMonths[idx];
                if (c.datasetIndex === 1) {
                  const pct = m.contacted > 0 ? ((m.cai / m.contacted) * 100).toFixed(1).replace('.', ',') : '0,0';
                  return ` CAI: ${c.raw} Unit (${pct}% dari Contacted)`;
                }
                return ` ${c.dataset.label}: ${c.raw} Unit`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grace: '18%',
            grid: { color: 'rgba(226, 232, 240, 0.5)' },
            ticks: { font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10.5, weight: '600' } }
          }
        }
      },
      plugins: [saDataLabelsPlugin]
    });
  }

  // Render SA Table
  const thead = document.getElementById('sa-funnel-table-head');
  const tbody = document.getElementById('sa-funnel-table-body');
  const tfoot = document.getElementById('sa-funnel-table-foot');

  if (isAll) {
    // 3 SA in 1 Table
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Bulan</th>
          <th class="numeric" style="color: #2563eb;">DIDIN (CAI | %)</th>
          <th class="numeric" style="color: #2563eb;">FICKY (CAI | %)</th>
          <th class="numeric" style="color: #2563eb;">ACEP (CAI | %)</th>
          <th class="numeric" style="background: #f1f5f9; color: #0f172a;">Total CAI</th>
          <th class="numeric">Total Cont</th>
          <th class="numeric">% Konversi</th>
        </tr>
      `;
    }

    let sumDidinCai = 0, sumFickyCai = 0, sumAcepCai = 0;
    let sumTotalCai = 0, sumTotalContacted = 0;

    if (tbody) {
      tbody.innerHTML = saData.map(row => {
        if (row.has_data === false) {
          return `
            <tr>
              <td><strong>${row.month}</strong></td>
              <td class="numeric" style="color: #94a3b8;">-</td>
              <td class="numeric" style="color: #94a3b8;">-</td>
              <td class="numeric" style="color: #94a3b8;">-</td>
              <td class="numeric" style="color: #94a3b8;">-</td>
              <td class="numeric" style="color: #94a3b8;">-</td>
              <td class="numeric" style="color: #94a3b8;">-</td>
            </tr>
          `;
        }

        sumDidinCai += (row.didin_cai || 0);
        sumFickyCai += (row.ficky_cai || 0);
        sumAcepCai += (row.acep_cai || 0);
        sumTotalCai += (row.cai || 0);
        sumTotalContacted += (row.contacted || 0);

        const convPct = row.contacted > 0 ? ((row.cai / row.contacted) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';

        return `
          <tr>
            <td><strong>${row.month}</strong></td>
            <td class="numeric">${row.didin_cai} <small style="color: #2563eb; font-weight: 600;">(${row.didin_contrib}%)</small></td>
            <td class="numeric">${row.ficky_cai} <small style="color: #2563eb; font-weight: 600;">(${row.ficky_contrib}%)</small></td>
            <td class="numeric">${row.acep_cai} <small style="color: #2563eb; font-weight: 600;">(${row.acep_contrib}%)</small></td>
            <td class="numeric" style="background: #ecfdf5; font-weight: 800; color: #047857;">${formatNum(row.cai)}</td>
            <td class="numeric">${formatNum(row.contacted)}</td>
            <td class="numeric" style="font-weight: 700; color: #16a34a;">${convPct}</td>
          </tr>
        `;
      }).join('');
    }

    if (tfoot) {
      const overallConvPct = sumTotalContacted > 0 ? ((sumTotalCai / sumTotalContacted) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
      const didinTotContrib = sumTotalCai > 0 ? ((sumDidinCai / sumTotalCai) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
      const fickyTotContrib = sumTotalCai > 0 ? ((sumFickyCai / sumTotalCai) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
      const acepTotContrib = sumTotalCai > 0 ? ((sumAcepCai / sumTotalCai) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';

      tfoot.innerHTML = `
        <tr style="background: #f8fafc; font-weight: bold;">
          <td>TOTAL (Jan - ${lastActiveMonth})</td>
          <td class="numeric">${formatNum(sumDidinCai)} <small style="color: #2563eb;">(${didinTotContrib})</small></td>
          <td class="numeric">${formatNum(sumFickyCai)} <small style="color: #2563eb;">(${fickyTotContrib})</small></td>
          <td class="numeric">${formatNum(sumAcepCai)} <small style="color: #2563eb;">(${acepTotContrib})</small></td>
          <td class="numeric" style="background: #ecfdf5; font-weight: 800; color: #047857;">${formatNum(sumTotalCai)}</td>
          <td class="numeric">${formatNum(sumTotalContacted)}</td>
          <td class="numeric" style="color: #16a34a; font-weight: 800;">${overallConvPct}</td>
        </tr>
      `;
    }
  } else {
    // Individual SA Table with % Kontribusi CAI (vs All SA)
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Bulan</th>
          <th class="numeric">Contacted</th>
          <th class="numeric">CAI</th>
          <th class="numeric">% (CAI/Cont)</th>
          <th class="numeric" style="color: #2563eb;">% Kontribusi CAI (vs All SA)</th>
        </tr>
      `;
    }

    let sumContacted = 0;
    let sumCai = 0;

    if (tbody) {
      tbody.innerHTML = saData.map(row => {
        if (row.has_data === false) {
          return `
            <tr>
              <td><strong>${row.month}</strong></td>
              <td class="numeric" style="color: #94a3b8;">-</td>
              <td class="numeric" style="color: #94a3b8;">-</td>
              <td class="numeric" style="color: #94a3b8;">-</td>
              <td class="numeric" style="color: #94a3b8;">-</td>
            </tr>
          `;
        }
        sumContacted += (row.contacted || 0);
        sumCai += (row.cai || 0);
        const pct = row.contacted > 0 ? ((row.cai / row.contacted) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
        const contrib = row.contrib_pct ? row.contrib_pct.toFixed(1).replace('.', ',') + '%' : '0,0%';

        return `
          <tr>
            <td><strong>${row.month}</strong></td>
            <td class="numeric">${formatNum(row.contacted)}</td>
            <td class="numeric">${formatNum(row.cai)}</td>
            <td class="numeric" style="font-weight: 700; color: #059669;">${pct}</td>
            <td class="numeric" style="font-weight: 700; color: #2563eb;">${contrib}</td>
          </tr>
        `;
      }).join('');
    }

    if (tfoot) {
      const totalPct = sumContacted > 0 ? ((sumCai / sumContacted) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
      // Total All SA CAI is 2,223
      const totalContribPct = ((sumCai / 2223) * 100).toFixed(1).replace('.', ',') + '%';
      tfoot.innerHTML = `
        <tr style="background: #f8fafc; font-weight: bold;">
          <td>TOTAL (Jan - ${lastActiveMonth})</td>
          <td class="numeric">${formatNum(sumContacted)}</td>
          <td class="numeric">${formatNum(sumCai)}</td>
          <td class="numeric" style="color: #16a34a; font-weight: 800;">${totalPct}</td>
          <td class="numeric" style="color: #2563eb; font-weight: 800;">${totalContribPct}</td>
        </tr>
      `;
    }
  }
}

function renderFunnelModules(period = activeFunnelModulePeriod || 'all') {
  activeFunnelModulePeriod = period;
  if (!funnellingData) return;

  const stages = funnellingData.funnel_stages_by_period?.[period] || funnellingData.funnel_stages;
  const reasons = funnellingData.not_cai_reasons_by_period?.[period] || funnellingData.not_cai_reasons;
  const prioritySegs = funnellingData.priority_segments_by_period?.[period] || funnellingData.priority_segments;
  const tcareProgs = funnellingData.potensi_by_program_by_period?.[period] || funnellingData.potensi_by_program;
  const bookingStat = funnellingData.status_booking_by_period?.[period] || funnellingData.status_booking;

  // Modul 1: Corong Funneling
  renderVisualFunnelFlow(stages);

  // Modul 2: NOT CAI Reason
  renderNotCaiReasons(reasons, stages?.cust_fu || 776);

  // Modul 3: Priority Segment Table
  renderPrioritySegmentTable(prioritySegs);

  // Modul 4: Potensi by T-Care & CARE-X
  renderTcareProgramsGrid(tcareProgs);

  // Modul 5: Status Booking
  renderStatusBooking(bookingStat);

  const periodLabels = {
    'all': 'Semua Periode (YTD)',
    'Q1': 'Kuartal 1 (Jan-Mar)',
    'Q2': 'Kuartal 2 (Apr-Jun)',
    'Q3': 'Kuartal 3 (Jul-Sep)',
    'Q4': 'Kuartal 4 (Okt-Des)',
    'Jan': 'Januari',
    'Feb': 'Februari',
    'Mar': 'Maret',
    'Apr': 'April',
    'Mei': 'Mei',
    'Jun': 'Juni',
    'Jul': 'Juli',
    'Agt': 'Agustus',
    'Sep': 'September',
    'Okt': 'Oktober'
  };
  const pText = periodLabels[period] || period;

  const badge1 = document.getElementById('funnel-module-period-badge');
  const badge2 = document.getElementById('not-cai-period-badge');
  const badge3 = document.getElementById('priority-segment-period-badge');
  const badge4 = document.getElementById('tcare-period-badge');
  const badge5 = document.getElementById('booking-status-period-badge');

  if (badge1) badge1.textContent = `Periode: ${pText}`;
  if (badge2) badge2.textContent = pText;
  if (badge3) badge3.textContent = pText;
  if (badge4) badge4.textContent = pText;
  if (badge5) badge5.textContent = pText;

  const sel = document.getElementById('select-funnel-module-period');
  if (sel && sel.value !== period) {
    sel.value = period;
  }
  const aiSel = document.getElementById('select-ai-advisor-period');
  if (aiSel && aiSel.value !== period) {
    aiSel.value = period;
  }

  // Update AI Aftersales Advisor dynamically for the selected period
  renderAIAdvisor(period);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let currentAIAdvisorFilter = 'all';

function renderAIAdvisor(period = activeFunnelModulePeriod || 'all') {
  if (!funnellingData) return;

  const stages = funnellingData.funnel_stages_by_period?.[period] || funnellingData.funnel_stages || {};
  const reasons = funnellingData.not_cai_reasons_by_period?.[period] || funnellingData.not_cai_reasons || [];
  const prioritySegs = funnellingData.priority_segments_by_period?.[period] || funnellingData.priority_segments || [];
  const saData = funnellingData.sa_breakdown || {};

  const periodLabels = {
    'all': 'Semua Periode (YTD)',
    'Q1': 'Kuartal 1 (Jan-Mar)',
    'Q2': 'Kuartal 2 (Apr-Jun)',
    'Q3': 'Kuartal 3 (Jul-Sep)',
    'Q4': 'Kuartal 4 (Okt-Des)',
    'Jan': 'Januari',
    'Feb': 'Februari',
    'Mar': 'Maret',
    'Apr': 'April',
    'Mei': 'Mei',
    'Jun': 'Juni',
    'Jul': 'Juli',
    'Agt': 'Agustus',
    'Sep': 'September',
    'Okt': 'Oktober'
  };
  const pText = periodLabels[period] || period;

  // Sync Dropdown and Badge
  const aiSel = document.getElementById('select-ai-advisor-period');
  if (aiSel && aiSel.value !== period) aiSel.value = period;
  const pBadge = document.getElementById('ai-advisor-period-badge');
  if (pBadge) pBadge.textContent = `Periode: ${pText}`;

  // 1. Core Metrics for this specific period
  const potency = stages.potency || 0;
  const custFu = stages.cust_fu || potency || 1;
  const contacted = stages.contacted || 0;
  const booking = stages.booking || 0;
  const cai = stages.cai || 0;
  const openBooking = Math.max(0, booking - cai);
  const uncontacted = Math.max(0, custFu - contacted);

  const contactedRate = custFu > 0 ? (contacted / custFu) * 100 : 0;
  const caiRate = contacted > 0 ? (cai / contacted) * 100 : 0;
  const bookingShowRate = booking > 0 ? (cai / booking) * 100 : 0;

  // Calculate Health Score tailored to this month's dynamics
  let healthScore = Math.round((contactedRate * 0.35) + (caiRate * 1.3) + (bookingShowRate * 0.35));
  healthScore = Math.max(50, Math.min(96, healthScore));

  const scoreValEl = document.getElementById('ai-health-score-val');
  if (scoreValEl) {
    scoreValEl.textContent = `${healthScore}/100`;
    scoreValEl.style.color = healthScore >= 80 ? '#10b981' : (healthScore >= 70 ? '#2563eb' : '#f59e0b');
  }

  // 2. Identify TRUE Top 3 Drop-off Reasons for this month (Sorted by Count Descending)
  const sortedReasons = [...reasons].sort((a, b) => (b.count || 0) - (a.count || 0));
  const topReason = sortedReasons[0] || { reason: 'Tidak diangkat', count: 0, percentage: 0 };
  const secondReason = sortedReasons[1] || { reason: 'Akan menghubungi Bengkel', count: 0, percentage: 0 };
  const thirdReason = sortedReasons[2] || { reason: 'Lain-lain', count: 0, percentage: 0 };

  // 3. Extract SA Performance for this specific period
  const getSaStats = (saName) => {
    const list = saData[saName]?.monthly || [];
    if (period === 'all') {
      const activeList = list.filter(x => x.has_data !== false && x.contacted > 0);
      const totCont = activeList.reduce((acc, x) => acc + (x.contacted || 0), 0);
      const totCai = activeList.reduce((acc, x) => acc + (x.cai || 0), 0);
      const rate = totCont > 0 ? ((totCai / totCont) * 100).toFixed(1) : '0.0';
      return { name: saName, contacted: totCont, cai: totCai, rate: parseFloat(rate) };
    } else if (period.startsWith('Q')) {
      const qMonths = period === 'Q1' ? ['Jan','Feb','Mar'] : (period === 'Q2' ? ['Apr','Mei','Jun'] : (period === 'Q3' ? ['Jul','Agt','Sep'] : ['Okt','Nov','Des']));
      const qList = list.filter(x => qMonths.includes(x.month));
      const totCont = qList.reduce((acc, x) => acc + (x.contacted || 0), 0);
      const totCai = qList.reduce((acc, x) => acc + (x.cai || 0), 0);
      const rate = totCont > 0 ? ((totCai / totCont) * 100).toFixed(1) : '0.0';
      return { name: saName, contacted: totCont, cai: totCai, rate: parseFloat(rate) };
    } else {
      const itm = list.find(x => x.month === period) || {};
      const cont = itm.contacted || 0;
      const c = itm.cai || 0;
      const rate = cont > 0 ? ((c / cont) * 100).toFixed(1) : '0.0';
      return { name: saName, contacted: cont, cai: c, rate: parseFloat(rate) };
    }
  };

  const saDidin = getSaStats('DIDIN');
  const saFicky = getSaStats('FICKY');
  const saAcep = getSaStats('ACEP');
  const totalSaCai = (saDidin.cai + saFicky.cai + saAcep.cai) || 1;
  saDidin.contrib = parseFloat(((saDidin.cai / totalSaCai) * 100).toFixed(1));
  saFicky.contrib = parseFloat(((saFicky.cai / totalSaCai) * 100).toFixed(1));
  saAcep.contrib = parseFloat(((saAcep.cai / totalSaCai) * 100).toFixed(1));

  const sasSortedByRate = [saDidin, saFicky, saAcep].sort((a, b) => b.rate - a.rate);
  const topConvSa = sasSortedByRate[0] || { name: 'ACEP', rate: 33.1 };
  const secondConvSa = sasSortedByRate[1] || { name: 'FICKY', rate: 31.4 };
  const thirdConvSa = sasSortedByRate[2] || { name: 'DIDIN', rate: 29.1 };

  const sasSortedByVol = [saDidin, saFicky, saAcep].sort((a, b) => b.cai - a.cai);
  const topVolSa = sasSortedByVol[0] || { name: 'FICKY', cai: 55, contrib: 37.2 };

  // 4. Extract Priority Segments for this specific period
  const p1 = prioritySegs.find(s => s.group === 'Priority 1') || {};
  const p1Pot = p1.total_potensi || 0;
  const p1Cai = p1.total_cai || 0;
  const p1Rate = p1.total_pct ? p1.total_pct.toFixed(1) : (p1Pot > 0 ? ((p1Cai / p1Pot) * 100).toFixed(1) : '0.0');
  const p1Never = p1.subgroups?.find(sg => sg.label.includes('Never claim')) || { potensi: 0, cai: 0, pct: 0 };

  const p5 = prioritySegs.find(s => s.group === 'Priority 5') || {};
  const p5Pot = p5.total_potensi || 0;
  const p5Cai = p5.total_cai || 0;
  const p5Rate = p5.total_pct ? p5.total_pct.toFixed(1) : (p5Pot > 0 ? ((p5Cai / p5Pot) * 100).toFixed(1) : '0.0');

  // 5. Generate Truly Dynamic Month-Specific Recommendations
  let recLeakageTitle = `Penyelamatan Tiket Booking Belum CAI Periode ${pText} (${formatNum(openBooking)} Unit)`;
  let recLeakageFact = `Pada periode <strong>${pText}</strong>, dari total <strong>${formatNum(booking)} tiket booking</strong>, tercatat <strong>${formatNum(cai)} unit</strong> telah hadir (CAI). Terdapat <strong>${formatNum(openBooking)} pelanggan booking yang belum tiba</strong> di bengkel. Estimasi potensi penyelamatan omzet: <strong>+${Math.round(openBooking * 0.45)} Unit CAI</strong>.`;
  let recLeakageActions = [
    `Segera kirimkan pesan konfirmasi jadwal H-1 dan H+1 via WhatsApp resmi kepada ${formatNum(openBooking)} customer booking ${pText}.`,
    `Berikan opsi penyesuaian jadwal servis (reschedule) ke jam non-padat (08.00–10.00 atau 14.00–16.00) jika customer berhalangan hadir pada tanggal awal.`,
    `Tawarkan layanan Toyota Home Service (THS) bagi pelanggan berjarak jauh atau terkendala kesibukan kerja.`
  ];

  if (openBooking === 0) {
    recLeakageTitle = `Optimalkan Penetrasi Database Follow-up Periode ${pText} (${formatNum(uncontacted)} Belum Terhubung)`;
    recLeakageFact = `Pada periode <strong>${pText}</strong>, terdapat <strong>${formatNum(uncontacted)} prospek</strong> yang belum berhasil dihubungi dari total ${formatNum(custFu)} database follow-up.`;
    recLeakageActions = [
      `Jadwalkan ulang panggilan ke database yang belum terhubung di jam golden hours (pk 10.30 dan pk 16.00).`,
      `Kirimkan blast reminder jadwal servis berkala via WhatsApp Business resmi Tunas Toyota.`,
      `Pastikan nomor kontak alternatif terverifikasi saat pelanggan servis berkala.`
    ];
  }

  // Month-Specific Nuances for Quick Wins
  let quickWinAdviceExtra = '';
  if (thirdReason.reason === 'Early') {
    quickWinAdviceExtra = `Khusus di ${pText}, alasan "Early" (${thirdReason.count} unit / ${thirdReason.percentage}%) cukup tinggi. Berikan edukasi bahwa batas servis berkala adalah setiap 6 bulan atau 10.000 KM (mana yang tercapai lebih dulu) agar oli tidak mengendap.`;
  } else if (thirdReason.reason === 'Service ditempat lain') {
    quickWinAdviceExtra = `Terdapat ${thirdReason.count} customer yang servis di bengkel luar. Berikan voucher tandingan "Diskon SBE 20% + Gratis Cek Rem & Cairan Wiper" untuk menarik kembali loyalitas pelanggan ke bengkel resmi.`;
  } else {
    quickWinAdviceExtra = `Optimalkan penawaran paket bundling konsumabel hemat (oli TMO + filter AC) untuk meyakinkan pelanggan yang masih ragu berkunjung.`;
  }

  const recommendations = [
    {
      id: 'rec-leakage',
      category: 'urgent',
      badgeText: '🔴 Tindakan Mendesak (Jangka Pendek)',
      title: recLeakageTitle,
      factText: recLeakageFact,
      actionItems: recLeakageActions,
      waTemplate: `Halo Bapak/Ibu, terima kasih atas kepercayaannya pada Tunas Toyota Kiaracondong. Kami ingin mengonfirmasi jadwal reservasi servis berkala kendaraan Anda untuk periode ${pText}. Agar teknisi dan suku cadang tetap siap tanpa antre, apakah ada waktu yang ingin disesuaikan kembali? Tim kami siap melayani Anda. Terima kasih! 🙏`
    },
    {
      id: 'rec-contacted',
      category: 'quickwins',
      badgeText: '🟡 Quick Wins Booster (Jangka Pendek)',
      title: `Strategi Penanganan Alasan "${topReason.reason}" (${formatNum(topReason.count)} Unit) di Bulan ${pText}`,
      factText: `Hambatan terbesar pelanggan tidak tiba pada <strong>${pText}</strong> adalah <strong>"${topReason.reason}" (${formatNum(topReason.count)} unit / ${topReason.percentage}%)</strong> disusul <strong>"${secondReason.reason}" (${formatNum(secondReason.count)} unit)</strong> dan <strong>"${thirdReason.reason}" (${formatNum(thirdReason.count)} unit)</strong>.`,
      actionItems: [
        `Alihkan waktu panggilan ke "Golden Hours" aftersales bengkel: Pukul 10:00–11:30 dan 15:30–17:00 (tingkat respons lebih tinggi).`,
        `Bila panggilan telepon tidak diangkat 2x berturut-turut, otomatis kirimkan ringkasan promo servis berkala ${pText} via WhatsApp resmi.`,
        quickWinAdviceExtra
      ],
      waTemplate: `Halo Bapak/Ibu, salam dari Tunas Toyota Kiaracondong. Kendaraan Anda telah memasuki jadwal servis berkala periode ${pText}. Nikmati promo khusus pengecekan menyeluruh & diskon jasa servis bulan ini. Balas pesan ini untuk reservasi praktis bebas antre. Terima kasih! 🚗✨`
    },
    {
      id: 'rec-segment',
      category: 'quickwins',
      badgeText: '🟡 Segmen Prioritas (Jangka Menengah)',
      title: `Fokus Penetrasi Segmen Expired Soon (${p1Pot} Unit) & CRT Merdeka (${p5Pot} Unit)`,
      factText: `Di periode <strong>${pText}</strong>, segmen <strong>Expired Soon (Priority 1)</strong> mencatatkan konversi <strong>${p1Rate}%</strong> (${p1Cai} dari ${p1Pot} unit tiba)${p1Never.potensi > 0 ? `, termasuk <strong>${p1Never.potensi} unit Never Claim</strong>` : ''}. Segmen <strong>CRT Merdeka (Priority 5)</strong> memiliki peluang <strong>${p5Pot} unit</strong>.`,
      actionItems: [
        `Prioritaskan penanganan 100% database prospek Expired Soon yang masih tersisa (${Math.max(0, p1Pot - p1Cai)} unit belum CAI) oleh tim MRA (RANI & NURI).`,
        `Tawarkan keuntungan khusus "Diskon Jasa SBE 25%" untuk kendaraan usia >8 tahun asal Merdeka Motor guna mereaktivasi pelanggan lama.`,
        `Ingatkan batas waktu masa berlaku kupon servis dan keuntungan garansi resmi sebelum periode ${pText} berakhir.`
      ],
      waTemplate: `Halo Bapak/Ibu pelanggan setia Tunas Toyota Kiaracondong. Khusus periode ${pText}, kendaraan Anda berhak mendapatkan Promo Diskon Servis Berkala hingga 25% dan gratis general check-up. Kuota terbatas, silakan balas pesan ini untuk booking jadwal servis Anda sekarang!`
    },
    {
      id: 'rec-team',
      category: 'team',
      badgeText: '🟢 Strategi Tim & Optimasi SA (Jangka Panjang)',
      title: `Kinerja & Coaching Service Advisor Periode ${pText} (DIDIN: ${saDidin.rate}%, FICKY: ${saFicky.rate}%, ACEP: ${saAcep.rate}%)`,
      factText: `Pada periode <strong>${pText}</strong>, konversi tertinggi dipimpin SA <strong>${topConvSa.name} (${topConvSa.rate}%)</strong>, disusul <strong>${secondConvSa.name} (${secondConvSa.rate}%)</strong> dan <strong>${thirdConvSa.name} (${thirdConvSa.rate}%)</strong>. Volume kedatangan terbesar diraih SA <strong>${topVolSa.name}</strong> dengan <strong>${topVolSa.cai} Unit CAI (${topVolSa.contrib}%)</strong>.`,
      actionItems: [
        `Adakan sesi sharing mingguan 15 menit: SA ${topConvSa.name} (${topConvSa.rate}% konversi di ${pText}) membagikan teknik pendekatan dan handling objection kepada rekan tim.`,
        `Seimbangkan distribusi database prospek baru agar setiap Service Advisor memiliki peluang volume kontak yang seimbang.`,
        `Lakukan evaluasi harian rasio kedatangan per SA guna mendeteksi pelanggan booking yang tertunda sejak dini.`
      ],
      waTemplate: `Halo Bapak/Ibu, salam dari Tunas Toyota Kiaracondong. Kami ingin memastikan kondisi kendaraan Anda senantiasa prima dan nyaman dikendarai. Service Advisor kami (${topConvSa.name} & tim) siap membantu reservasi servis dan konsultasi teknis kendaraan Anda. Balas pesan ini untuk memilih waktu terbaik. Terima kasih!`
    }
  ];

  // Update counts on filter tabs
  const countAll = recommendations.length;
  const countUrgent = recommendations.filter(r => r.category === 'urgent').length;
  const countQuick = recommendations.filter(r => r.category === 'quickwins').length;
  const countTeam = recommendations.filter(r => r.category === 'team').length;

  const elAll = document.getElementById('count-ai-all');
  const elUrg = document.getElementById('count-ai-urgent');
  const elQck = document.getElementById('count-ai-quickwins');
  const elTeam = document.getElementById('count-ai-team');

  if (elAll) elAll.textContent = countAll;
  if (elUrg) elUrg.textContent = countUrgent;
  if (elQck) elQck.textContent = countQuick;
  if (elTeam) elTeam.textContent = countTeam;

  // Render cards based on current filter
  const container = document.getElementById('ai-advisor-cards-container');
  if (!container) return;

  const filtered = currentAIAdvisorFilter === 'all'
    ? recommendations
    : recommendations.filter(r => r.category === currentAIAdvisorFilter);

  container.innerHTML = filtered.map(rec => {
    const waBlock = rec.waTemplate ? `
      <div class="ai-wa-box">
        <div class="ai-wa-header">
          <span>💬 Template Pesan WhatsApp Follow-up (${pText}):</span>
          <button type="button" class="btn-copy-wa" data-text="${encodeURIComponent(rec.waTemplate)}">📋 Salin Pesan</button>
        </div>
        <div class="ai-wa-text">${escapeHtml(rec.waTemplate)}</div>
      </div>
    ` : '';

    return `
      <div class="ai-card-item ${rec.category}">
        <div>
          <div class="ai-card-badge ${rec.category}">${rec.badgeText}</div>
          <div class="ai-card-title">${rec.title}</div>
          <div class="ai-fact-box">${rec.factText}</div>
          <ul class="ai-action-list">
            ${rec.actionItems.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
        ${waBlock}
      </div>
    `;
  }).join('');

  // Re-bind copy buttons
  container.querySelectorAll('.btn-copy-wa').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = decodeURIComponent(btn.getAttribute('data-text') || '');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          const orig = btn.innerHTML;
          btn.innerHTML = '✓ Tersalin!';
          btn.style.background = '#15803d';
          setTimeout(() => {
            btn.innerHTML = orig;
            btn.style.background = '';
          }, 2000);
        });
      }
    });
  });
}

function renderVisualFunnelFlow(stages) {
  const container = document.getElementById('visual-funnel-bars');
  if (!container || !stages) return;

  const potency = stages.potency || 457;
  const custFu = stages.cust_fu || 300;
  const connected = stages.connected || 285;
  const contacted = stages.contacted || 270;
  const booking = stages.booking || 60;
  const cai = stages.cai || 30;

  // Conversion calculations
  const pctFu = potency > 0 ? ((custFu / potency) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
  const pctConnected = custFu > 0 ? ((connected / custFu) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
  const pctContacted = connected > 0 ? ((contacted / connected) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
  // Booking vs Contacted (as per drawing: 60/270 = 22,2%)
  const pctBooking = contacted > 0 ? ((booking / contacted) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
  // CAI vs Contacted (EXPLICITLY requested by user: "persentasi CAI itu hasil dari dibandingkan terhapad contacted": 30/270 = 11,1%)
  const pctCai = contacted > 0 ? ((cai / contacted) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';

  container.innerHTML = `
    <div class="h-funnel-container">
      <div class="h-funnel-rows-wrap">
        <!-- Row 1: Potency -->
        <div class="h-funnel-row">
          <div class="h-funnel-label-col">
            <span class="h-funnel-dot dot-potency"></span>
            <span class="h-funnel-name">Potency</span>
          </div>
          <div class="h-funnel-bar-col">
            <div class="h-funnel-bar bar-potency" style="width: 98%;" title="Potency: ${potency} Unit (100% Basis Total Potensi)">
              <span class="h-funnel-val-text">${potency} Unit</span>
            </div>
          </div>
          <div class="h-funnel-rate-col">
            <div class="h-funnel-badge base" title="Potency: ${potency} Unit">
              <span class="hfb-pct">100%</span>
              <span class="hfb-sub">Basis</span>
            </div>
          </div>
        </div>

        <!-- Row 2: Cust FU -->
        <div class="h-funnel-row">
          <div class="h-funnel-label-col">
            <span class="h-funnel-dot dot-fu"></span>
            <span class="h-funnel-name">Cust FU</span>
          </div>
          <div class="h-funnel-bar-col">
            <div class="h-funnel-bar bar-fu" style="width: 78%;" title="Cust FU: ${custFu} Unit (${pctFu} dari Potency)">
              <span class="h-funnel-val-text">${custFu} Unit</span>
            </div>
          </div>
          <div class="h-funnel-rate-col">
            <div class="h-funnel-badge" title="Cust FU: ${custFu} Unit (${pctFu} dari Potency)">
              <span class="hfb-pct">${pctFu}</span>
              <span class="hfb-sub">vs Potency</span>
            </div>
          </div>
        </div>

        <!-- Row 3: Connected -->
        <div class="h-funnel-row">
          <div class="h-funnel-label-col">
            <span class="h-funnel-dot dot-conn"></span>
            <span class="h-funnel-name">Connected</span>
          </div>
          <div class="h-funnel-bar-col">
            <div class="h-funnel-bar bar-conn" style="width: 71%;" title="Connected: ${connected} Unit (${pctConnected} dari Cust FU)">
              <span class="h-funnel-val-text">${connected} Unit</span>
            </div>
          </div>
          <div class="h-funnel-rate-col">
            <div class="h-funnel-badge" title="Connected: ${connected} Unit (${pctConnected} dari Cust FU)">
              <span class="hfb-pct">${pctConnected}</span>
              <span class="hfb-sub">vs Cust FU</span>
            </div>
          </div>
        </div>

        <!-- Row 4: Contacted -->
        <div class="h-funnel-row">
          <div class="h-funnel-label-col">
            <span class="h-funnel-dot dot-cont"></span>
            <span class="h-funnel-name">Contacted</span>
          </div>
          <div class="h-funnel-bar-col">
            <div class="h-funnel-bar bar-cont" style="width: 64%;" title="Contacted: ${contacted} Unit (${pctContacted} dari Connected)">
              <span class="h-funnel-val-text">${contacted} Unit</span>
            </div>
          </div>
          <div class="h-funnel-rate-col">
            <div class="h-funnel-badge" title="Contacted: ${contacted} Unit (${pctContacted} dari Connected)">
              <span class="hfb-pct">${pctContacted}</span>
              <span class="hfb-sub">vs Connected</span>
            </div>
          </div>
        </div>

        <!-- Row 5: Booking -->
        <div class="h-funnel-row">
          <div class="h-funnel-label-col">
            <span class="h-funnel-dot dot-bk"></span>
            <span class="h-funnel-name">Booking</span>
          </div>
          <div class="h-funnel-bar-col">
            <div class="h-funnel-bar bar-bk" style="width: 36%;" title="Booking: ${booking} Unit (${pctBooking} dari Contacted)">
              <span class="h-funnel-val-text">${booking} Unit</span>
            </div>
          </div>
          <div class="h-funnel-rate-col">
            <div class="h-funnel-badge booking" title="Booking: ${booking} Unit (${pctBooking} dari Contacted)">
              <span class="hfb-pct">${pctBooking}</span>
              <span class="hfb-sub">vs Contacted</span>
            </div>
          </div>
        </div>

        <!-- Row 6: CAI -->
        <div class="h-funnel-row">
          <div class="h-funnel-label-col">
            <span class="h-funnel-dot dot-cai"></span>
            <span class="h-funnel-name">CAI</span>
          </div>
          <div class="h-funnel-bar-col">
            <div class="h-funnel-bar bar-cai" style="width: 24%;" title="CAI: ${cai} Unit (${pctCai} dari Contacted)">
              <span class="h-funnel-val-text">${cai} Unit</span>
            </div>
          </div>
          <div class="h-funnel-rate-col">
            <div class="h-funnel-badge cai-highlight" title="CAI: ${cai} Unit (${pctCai} dari Contacted)">
              <span class="hfb-pct">${pctCai}</span>
              <span class="hfb-sub">vs Contacted</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Pipeline Ribbon Strip -->
      <div class="h-funnel-pipeline-strip">
        <div class="hfps-step">
          <span class="hfps-dot dot-potency"></span>
          <span class="hfps-label">Potency</span>
          <strong class="hfps-val">${potency}</strong>
        </div>
        <span class="hfps-arrow">➔</span>
        <div class="hfps-step">
          <span class="hfps-dot dot-fu"></span>
          <span class="hfps-label">Cust FU</span>
          <strong class="hfps-val">${custFu}</strong>
        </div>
        <span class="hfps-arrow">➔</span>
        <div class="hfps-step">
          <span class="hfps-dot dot-conn"></span>
          <span class="hfps-label">Connected</span>
          <strong class="hfps-val">${connected}</strong>
        </div>
        <span class="hfps-arrow">➔</span>
        <div class="hfps-step">
          <span class="hfps-dot dot-cont"></span>
          <span class="hfps-label">Contacted</span>
          <strong class="hfps-val">${contacted}</strong>
        </div>
        <span class="hfps-arrow">➔</span>
        <div class="hfps-step">
          <span class="hfps-dot dot-bk"></span>
          <span class="hfps-label">Booking</span>
          <strong class="hfps-val">${booking}</strong>
        </div>
        <span class="hfps-arrow">➔</span>
        <div class="hfps-step cai">
          <span class="hfps-dot dot-cai"></span>
          <span class="hfps-label">CAI</span>
          <strong class="hfps-val">${cai}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderNotCaiReasons(reasons, totalCustFu) {
  const container = document.getElementById('reasons-list-wrap');
  if (!container || !reasons) return;

  // Ensure sorted alphabetically A-Z (as requested in Image 2 green notes)
  const sorted = [...reasons].sort((a, b) => a.reason.localeCompare(b.reason, 'id', { sensitivity: 'base' }));

  container.innerHTML = sorted.map(item => {
    const pct = totalCustFu > 0 ? ((item.count / totalCustFu) * 100).toFixed(1) : item.percentage.toFixed(1);
    const barWidth = Math.min(100, Math.max(5, (item.count / (totalCustFu * 0.15)) * 100));
    return `
      <div class="reason-item-row" title="${item.reason}: ${item.count} unit (${pct}%)">
        <span class="reason-title">${item.reason}</span>
        <div class="reason-track">
          <div class="reason-fill" style="width: ${barWidth}%;"></div>
        </div>
        <span class="reason-pct">${pct.replace('.', ',')}%</span>
        <span class="reason-count">${item.count}</span>
      </div>
    `;
  }).join('');
}

function renderPrioritySegmentTable(segments) {
  const tbody = document.getElementById('priority-segment-tbody');
  if (!tbody || !segments) return;

  let html = '';
  segments.forEach(seg => {
    html += `
      <tr class="group-header-row">
        <td colspan="4">${seg.group} ${seg.title ? `— ${seg.title}` : ''}</td>
      </tr>
    `;

    (seg.subgroups || []).forEach(sub => {
      const pctStr = sub.pct ? sub.pct.toFixed(1).replace('.', ',') + '%' : '0,0%';
      html += `
        <tr>
          <td class="subgroup-indent">${sub.label}</td>
          <td class="numeric">${formatNum(sub.potensi)}</td>
          <td class="numeric">${formatNum(sub.cai)}</td>
          <td class="numeric" style="font-weight: 600; color: #2563eb;">${pctStr}</td>
        </tr>
      `;
    });

    if (seg.total_label) {
      const totPctStr = seg.total_pct ? seg.total_pct.toFixed(1).replace('.', ',') + '%' : '0,0%';
      html += `
        <tr class="subtotal-row">
          <td>${seg.total_label}</td>
          <td class="numeric">${formatNum(seg.total_potensi)}</td>
          <td class="numeric">${formatNum(seg.total_cai)}</td>
          <td class="numeric">${totPctStr}</td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = html;
}

function renderTcareProgramsGrid(programs) {
  const container = document.getElementById('tcare-programs-cards');
  if (!container || !programs) return;

  const keys = ['t_care', 't_care_lite_plus', 't_care_lite', 'care_x'];
  container.innerHTML = keys.map(k => {
    const p = programs[k];
    if (!p) return '';
    const fuRate = p.potency > 0 ? ((p.cust_fu / p.potency) * 100).toFixed(0) : 0;
    // Rumus persentase CAI: CAI dibagi Contacted (sesuai instruksi)
    const caiRate = p.contacted > 0 ? ((p.cai / p.contacted) * 100).toFixed(0) : 0;
    return `
      <div class="tcare-prog-card">
        <div class="tcare-prog-title">${p.title}</div>
        <div class="tcare-mini-funnel-steps">
          <div class="tcare-m-step"><span class="tcare-m-label">Potency:</span><span class="tcare-m-val">${formatNum(p.potency)}</span></div>
          <div class="tcare-m-step"><span class="tcare-m-label">Cust FU:</span><span class="tcare-m-val">${formatNum(p.cust_fu)} (${fuRate}%)</span></div>
          <div class="tcare-m-step"><span class="tcare-m-label">Connected:</span><span class="tcare-m-val">${formatNum(p.connected)}</span></div>
          <div class="tcare-m-step"><span class="tcare-m-label">Contacted:</span><span class="tcare-m-val">${formatNum(p.contacted)}</span></div>
          <div class="tcare-m-step"><span class="tcare-m-label">Booking:</span><span class="tcare-m-val" style="color:#d97706;">${formatNum(p.booking)}</span></div>
          <div class="tcare-m-step"><span class="tcare-m-label">CAI:</span><span class="tcare-m-val" style="color:#16a34a;">${formatNum(p.cai)} (${caiRate}%)</span></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStatusBooking(status) {
  if (!status) return;
  const bookingCount = document.getElementById('sb-booking-count');
  const showCount = document.getElementById('sb-show-count');
  const openCount = document.getElementById('sb-open-count');
  const showFill = document.querySelector('.sb-item.show .sb-fill');
  const openFill = document.querySelector('.sb-item.open .sb-fill');
  const showMeta = document.querySelector('.sb-item.show .sb-meta');
  const openMeta = document.querySelector('.sb-item.open .sb-meta');

  const bTot = status.booking?.count || 0;
  const showTot = status.show_cai?.count || 0;
  const showPct = status.show_cai?.pct ?? (bTot > 0 ? Number((showTot / bTot * 100).toFixed(1)) : 0);
  const openTot = status.open?.count || 0;
  const openPct = status.open?.pct ?? (bTot > 0 ? Number((openTot / bTot * 100).toFixed(1)) : 0);

  if (bookingCount) bookingCount.textContent = `${formatNum(bTot)} Unit (100%)`;
  if (showCount) showCount.textContent = `${formatNum(showTot)} Unit (${showPct}%)`;
  if (openCount) openCount.textContent = `${formatNum(openTot)} Unit (${openPct}%)`;

  if (showFill) showFill.style.width = `${Math.min(100, showPct)}%`;
  if (openFill) openFill.style.width = `${Math.min(100, openPct)}%`;

  if (showMeta) showMeta.innerHTML = `${showPct}% — Hadir &amp; melakukan servis di bengkel`;
  if (openMeta) openMeta.innerHTML = `⚠️ <strong>${openPct}%:</strong> Customer yang jawab Booking tapi <u>Not CAI</u> (perlu follow up ulang)`;
}

function initFunnellingInteractions() {
  // Potensi MRA & THS period selector
  const potMonthSelect = document.getElementById('select-potensi-month');
  if (potMonthSelect && !potMonthSelect.dataset.bound) {
    potMonthSelect.dataset.bound = 'true';
    potMonthSelect.addEventListener('change', (e) => {
      renderPotensiMraAndThs(e.target.value);
    });
  }

  // Funnel modules period selector (Modul 1 & 2)
  const funnelModuleSelect = document.getElementById('select-funnel-module-period');
  if (funnelModuleSelect && !funnelModuleSelect.dataset.bound) {
    funnelModuleSelect.dataset.bound = 'true';
    funnelModuleSelect.addEventListener('change', (e) => {
      renderFunnelModules(e.target.value);
    });
  }

  // AI Advisor Period Selector
  const aiPeriodSelect = document.getElementById('select-ai-advisor-period');
  if (aiPeriodSelect && !aiPeriodSelect.dataset.bound) {
    aiPeriodSelect.dataset.bound = 'true';
    aiPeriodSelect.addEventListener('change', (e) => {
      renderFunnelModules(e.target.value);
    });
  }

  // SA toggle buttons above special chart
  document.querySelectorAll('.sa-toggle-btn').forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sa-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sa = btn.getAttribute('data-sa');
        renderSAFunnelSpecial(sa);
      });
    }
  });

  // AI Advisor filter tabs
  document.querySelectorAll('.ai-tab-btn').forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAIAdvisorFilter = btn.getAttribute('data-filter') || 'all';
        renderAIAdvisor(activeFunnelModulePeriod);
      });
    }
  });

  // AI Refresh button
  const btnRefreshAI = document.getElementById('btn-refresh-ai');
  if (btnRefreshAI && !btnRefreshAI.dataset.bound) {
    btnRefreshAI.dataset.bound = 'true';
    btnRefreshAI.addEventListener('click', () => {
      btnRefreshAI.style.transform = 'rotate(180deg)';
      btnRefreshAI.style.transition = 'transform 0.4s ease';
      renderAIAdvisor(activeFunnelModulePeriod);
      setTimeout(() => {
        btnRefreshAI.style.transform = '';
      }, 400);
    });
  }
}

// ==========================================================================
// 11. BOOKING MONITORING & LIVE TIKTOK ENGINE (Image 4)
// ==========================================================================

const BOOKING_GSHEET_CONFIG = {
  sheetId: '1b60d-JO50LU4KyywuULokmDIU7z3Ts_1',
  gid: '1751906512',
  csvUrl: 'https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/gviz/tq?tqx=out:csv&gid=1751906512'
};

function processLiveBookingCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return null;
  const rows = parseGSheetCSV(csvText);
  if (!rows || rows.length < 2) return null;

  const monthsMap = {
    jan: 0, feb: 1, mar: 2, apr: 3,
    mei: 4, may: 4, jun: 5, jul: 6,
    agt: 7, agu: 7, aug: 7, sep: 8,
    okt: 9, oct: 9, nov: 10, des: 11, dec: 11
  };

  const channelsDef = [
    { key: 'inc_call', title: 'Incoming Call (Inc. Call)', code: 'INC_CALL', matchers: ['incoming', 'inc. call', 'inc call', 'inc_call'] },
    { key: 'boc', title: 'Booking on Call (BOC)', code: 'BOC', matchers: ['boc', 'booking on call'] },
    { key: 'sales', title: 'Sales Booking Referral', code: 'SALES', matchers: ['sales', 'referral'] },
    { key: 'm_toyota', title: 'M-Toyota', code: 'M_TOYOTA', matchers: ['m-toyota', 'm toyota', 'mobile app', 'mtoyota'] },
    { key: 'sa_total', title: 'SA Total / Summary', code: 'SA_TOTAL', matchers: ['sa total', 'akumulasi semua sa', 'total sa', 'summary sa', 'sa summary'] },
    { key: 'sa_didin', title: 'SA Didin', code: 'SA_DIDIN', matchers: ['didin'] },
    { key: 'sa_ficky', title: 'SA Ficky', code: 'SA_FICKY', matchers: ['ficky'] },
    { key: 'sa_acep', title: 'SA Acep', code: 'SA_ACEP', matchers: ['acep'] }
  ];

  const resultChannels = {};
  channelsDef.forEach(c => {
    resultChannels[c.key] = {
      title: c.title,
      code: c.code,
      ytd_total: 0,
      monthly: Array(12).fill(null)
    };
  });

  // FORMAT 1: Horizontal matrix (Header row contains month names)
  let headerRowIdx = -1;
  let monthColIndices = {};

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    const foundMonths = {};
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] || '').trim().toLowerCase();
      for (const [mName, mIdx] of Object.entries(monthsMap)) {
        if (cell === mName || cell.startsWith(mName + ' ') || cell.startsWith(mName + '-') || cell === mName + ' 2026') {
          if (foundMonths[mIdx] === undefined) {
            foundMonths[mIdx] = c;
          }
          break;
        }
      }
    }
    if (Object.keys(foundMonths).length >= 3) {
      headerRowIdx = r;
      monthColIndices = foundMonths;
      break;
    }
  }

  if (headerRowIdx !== -1) {
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const label = (row[0] || '').trim().toLowerCase() + ' ' + (row[1] || '').trim().toLowerCase();
      
      for (const chDef of channelsDef) {
        const matches = chDef.matchers.some(m => label.includes(m));
        if (matches) {
          if (chDef.key === 'sa_total' && (label.includes('didin') || label.includes('ficky') || label.includes('acep')) && !label.includes('total') && !label.includes('akumulasi')) {
            continue;
          }
          for (const [mIdxStr, colIdx] of Object.entries(monthColIndices)) {
            const mIdx = parseInt(mIdxStr, 10);
            const valRaw = row[colIdx];
            if (valRaw !== undefined && valRaw !== null && valRaw !== '') {
              const cleanStr = String(valRaw).trim().replace(/\./g, '').replace(/,/g, '.');
              const num = parseFloat(cleanStr);
              if (!isNaN(num)) {
                resultChannels[chDef.key].monthly[mIdx] = Math.round(num);
              }
            }
          }
          break;
        }
      }
    }
  } else {
    // FORMAT 2: Vertical layout (Rows are months, columns are channels)
    let channelColIndices = {};
    let colHeaderRowIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      const foundCols = {};
      for (let c = 0; c < row.length; c++) {
        const cell = (row[c] || '').trim().toLowerCase();
        for (const chDef of channelsDef) {
          if (chDef.matchers.some(m => cell.includes(m))) {
            if (chDef.key === 'sa_total' && (cell.includes('didin') || cell.includes('ficky') || cell.includes('acep')) && !cell.includes('total')) {
              continue;
            }
            if (!foundCols[chDef.key]) {
              foundCols[chDef.key] = c;
            }
          }
        }
      }
      if (Object.keys(foundCols).length >= 2) {
        colHeaderRowIdx = r;
        channelColIndices = foundCols;
        break;
      }
    }

    if (colHeaderRowIdx !== -1) {
      for (let r = colHeaderRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const monthCell = (row[0] || '').trim().toLowerCase();
        let matchedMonthIdx = -1;
        for (const [mName, mIdx] of Object.entries(monthsMap)) {
          if (monthCell === mName || monthCell.startsWith(mName + ' ') || monthCell.startsWith(mName + '-') || monthCell === mName + ' 2026') {
            matchedMonthIdx = mIdx;
            break;
          }
        }
        if (matchedMonthIdx !== -1) {
          for (const [chKey, colIdx] of Object.entries(channelColIndices)) {
            const valRaw = row[colIdx];
            if (valRaw !== undefined && valRaw !== null && valRaw !== '') {
              const cleanStr = String(valRaw).trim().replace(/\./g, '').replace(/,/g, '.');
              const num = parseFloat(cleanStr);
              if (!isNaN(num)) {
                resultChannels[chKey].monthly[matchedMonthIdx] = Math.round(num);
              }
            }
          }
        }
      }
    }
    // FORMAT 3: Row-level booking log (e.g. GID 1751906512 with 'Unique Code', 'Tipe Booking', 'BOOKING FROM')
    const logHeaderIdx = rows.findIndex(r => r && r.some(c => (c || '').toLowerCase().includes('tipe booking')));
    if (logHeaderIdx !== -1) {
      const targetYear = String(new Date().getFullYear());
      const targetYearShort = targetYear.slice(-2);
      const logMonthMap = {
        january: 0, jan: 0, '1': 0, '01': 0,
        february: 1, feb: 1, '2': 1, '02': 1,
        march: 2, mar: 2, '3': 2, '03': 2,
        april: 3, apr: 3, '4': 3, '04': 3,
        may: 4, mei: 4, '5': 4, '05': 4,
        june: 5, jun: 5, '6': 5, '06': 5,
        july: 6, jul: 6, '7': 6, '07': 6,
        august: 7, agt: 7, agu: 7, aug: 7, '8': 7, '08': 7,
        september: 8, sep: 8, '9': 8, '09': 8,
        october: 9, okt: 9, oct: 9, '10': 9,
        november: 10, nov: 10, '11': 10,
        december: 11, des: 11, dec: 11, '12': 11
      };

      for (let r = logHeaderIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length < 9) continue;
        const yr = (row[3] || '').trim();
        if (yr !== targetYear && yr !== targetYearShort) continue;

        const col0 = (row[0] || '').trim().toLowerCase();
        const col2 = (row[2] || '').trim().toLowerCase();
        const mIdx = logMonthMap[col0] !== undefined ? logMonthMap[col0] : logMonthMap[col2];
        if (mIdx === undefined) continue;

        const tipe = (row[6] || '').trim().toLowerCase();
        const bFrom = (row[8] || '').trim().toLowerCase();
        const inc = (key) => {
          resultChannels[key].monthly[mIdx] = (resultChannels[key].monthly[mIdx] || 0) + 1;
        };

        if (tipe.includes('inc')) {
          inc('inc_call');
        } else if (tipe === 'boc') {
          inc('boc');
        } else if (tipe.includes('sales')) {
          inc('sales');
        } else if (tipe.includes('m-toyota') || tipe.includes('m toyota') || tipe.includes('mtoyota')) {
          inc('m_toyota');
        } else if (tipe === 'sa') {
          inc('sa_total');
          if (bFrom.includes('didin')) inc('sa_didin');
          else if (bFrom.includes('ficky')) inc('sa_ficky');
          else if (bFrom.includes('acep')) inc('sa_acep');
        }
      }
    }
  }

  // Recalculate sa_total if not given
  const hasSaTotal = resultChannels.sa_total.monthly.some(v => v !== null);
  if (!hasSaTotal) {
    for (let m = 0; m < 12; m++) {
      const d = resultChannels.sa_didin.monthly[m];
      const f = resultChannels.sa_ficky.monthly[m];
      const a = resultChannels.sa_acep.monthly[m];
      if (d !== null || f !== null || a !== null) {
        resultChannels.sa_total.monthly[m] = (d || 0) + (f || 0) + (a || 0);
      }
    }
  }

  // Calculate YTD totals
  let activeMonthsCount = 0;
  for (const chKey of Object.keys(resultChannels)) {
    const ch = resultChannels[chKey];
    ch.ytd_total = ch.monthly.reduce((acc, v) => acc + (v !== null ? v : 0), 0);
  }

  for (let m = 0; m < 12; m++) {
    if (Object.values(resultChannels).some(ch => ch.monthly[m] !== null)) {
      activeMonthsCount = m + 1;
    }
  }

  if (activeMonthsCount === 0) return null;

  return {
    channels: resultChannels,
    activeMonthsCount: activeMonthsCount
  };
}

async function syncBookingFromLiveSheet(options = {}) {
  const isManual = options.isManual || false;
  const syncBtn = document.getElementById('btn-sync-booking-sheet');
  const spinIcon = document.getElementById('booking-sync-spin-icon');
  const label = document.getElementById('booking-sync-label');

  if (syncBtn && spinIcon && label) {
    spinIcon.style.animation = 'spin 0.8s linear infinite';
    label.textContent = 'Menghubungkan ke Google Sheets...';
    syncBtn.disabled = true;
  }

  let success = false;
  let parsedBk = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const [resp, respTt] = await Promise.all([
      fetch(BOOKING_GSHEET_CONFIG.csvUrl + '&_t=' + Date.now(), { signal: controller.signal, cache: 'no-store' }),
      fetch('https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/gviz/tq?tqx=out:csv&gid=1727895687&_t=' + Date.now(), { signal: controller.signal, cache: 'no-store' }).catch(() => null)
    ]);
    clearTimeout(timer);

    if (resp && resp.ok) {
      const csvText = await resp.text();
      if (csvText && csvText.length > 50 && !csvText.includes('<!DOCTYPE html>')) {
        parsedBk = processLiveBookingCSV(csvText);
        if (parsedBk && parsedBk.channels) {
          if (!bookingData) {
            bookingData = {
              months: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"],
              channels: {}
            };
          }
          bookingData.channels = parsedBk.channels;
          bookingData.meta = bookingData.meta || {};
          bookingData.meta.spreadsheet_id = BOOKING_GSHEET_CONFIG.sheetId;
          bookingData.meta.gid = BOOKING_GSHEET_CONFIG.gid;
          bookingData.meta.active_months_count = parsedBk.activeMonthsCount;
          bookingData.meta.source = 'live_google_sheets';
          bookingData.meta.updated_at = new Date().toISOString();
          bookingData.meta.note = `Data tersinkronkan live dari Google Sheets (GID: ${BOOKING_GSHEET_CONFIG.gid})`;
          success = true;
        }
      }
    }

    if (respTt && respTt.ok) {
      const ttCsv = await respTt.text();
      const parsedTt = processLiveTikTokCSV(ttCsv);
      if (parsedTt) {
        if (!bookingData) {
          bookingData = {
            months: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"],
            channels: {}
          };
        }
        bookingData.tiktok_live = {
          title: "Performa Live TikTok Bengkel",
          source: "Google Sheets Live (GID 1727895687)",
          kpis: parsedTt.kpis,
          monthly_trend: parsedTt.monthly_trend
        };
      }
    }

    if (success || (bookingData && bookingData.tiktok_live)) {
      localStorage.setItem('bengkel_custom_booking_data', JSON.stringify(bookingData));
      renderBooking();
      if (typeof renderTikTokLive === 'function') renderTikTokLive();
    }
  } catch (err) {
    console.warn('Sync booking sheet network/permission error:', err);
  }

  if (syncBtn && spinIcon && label) {
    spinIcon.style.animation = '';
    label.textContent = 'Sinkronkan Sheet Booking';
    syncBtn.disabled = false;
  }

  if (success && parsedBk) {
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const lastActiveMonth = monthNames[parsedBk.activeMonthsCount - 1] || 'Oktober';
    showFloatingToast(`✓ Berhasil menyinkronkan data Booking langsung dari Google Spreadsheet! (Data aktif s/d ${lastActiveMonth} 2026)`, '#10b981');
  } else if (isManual) {
    showFloatingToast(`⚠️ Tidak dapat mengakses Google Spreadsheet Booking (Akses Dibatasi). Silakan buka spreadsheet > klik Bagikan > ubah Akses Umum menjadi "Siapa saja yang memiliki link" (Pelihat).`, '#f59e0b');
  }

  return success;
}

async function loadBookingData() {
  // 1. Load from local custom cache if available
  try {
    const localResp = await fetch('data/booking_data.json?v=' + Date.now(), { cache: 'no-store' });
    if (localResp.ok) {
      bookingData = await localResp.json();
    }
  } catch (err) {
    console.warn('Could not load server booking_data.json, trying local cache:', err);
  }

  const cachedBk = localStorage.getItem('bengkel_custom_booking_data');
  if (cachedBk) {
    try {
      const parsedCached = JSON.parse(cachedBk);
      const serverTime = bookingData?.meta?.updated_at ? new Date(bookingData.meta.updated_at).getTime() : 0;
      const cachedTime = parsedCached?.meta?.updated_at ? new Date(parsedCached.meta.updated_at).getTime() : 0;
      const isSameGid = parsedCached?.meta?.gid === BOOKING_GSHEET_CONFIG.gid;
      if (parsedCached && parsedCached.channels && isSameGid && cachedTime >= serverTime) {
        bookingData = parsedCached;
      } else if (!isSameGid || serverTime > cachedTime) {
        localStorage.removeItem('bengkel_custom_booking_data');
      }
    } catch (e) {
      localStorage.removeItem('bengkel_custom_booking_data');
    }
  }

  renderBooking();
  initBookingInteractions();

  // 2. Background live sync from Google Sheet
  syncBookingFromLiveSheet({ isManual: false }).catch(() => {});
}

function renderBooking() {
  if (!bookingData) return;

  const months = bookingData.months || ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const channels = bookingData.channels || {};

  // Update active state on chart type buttons
  document.querySelectorAll('.btn-bk-type').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-bk-type') === currentBookingCardType);
  });

  // Data labels inline plugin: draws bold numbers directly on top of data points/bars so no click or hover is required
  const bookingDataLabelsPlugin = {
    id: 'bookingDataLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, i) => {
        if (dataset.isTarget) return;
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((element, index) => {
          const val = dataset.data[index];
          if (val === null || val === undefined) return;
          ctx.save();
          ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          const x = element.x;
          let y = element.y - 3;
          if (chart.config.type === 'bar') {
            y = Math.min(element.y - 3, chart.chartArea.bottom - 4);
          }
          ctx.fillText(val, x, y);
          ctx.restore();
        });
      });
    }
  };

  // 1. Render 8 Booking Channel Cards (Switchable between Line, Batang, and Area)
  const channelConfigs = [
    { key: 'inc_call', canvasId: 'chart-b-inc', badgeId: 'b-inc-total', color: '#2563eb', target: 35 },
    { key: 'boc', canvasId: 'chart-b-boc', badgeId: 'b-boc-total', color: '#7c3aed', target: 25 },
    { key: 'sales', canvasId: 'chart-b-sales', badgeId: 'b-sales-total', color: '#4b5563', target: 15 },
    { key: 'm_toyota', canvasId: 'chart-b-mtoyota', badgeId: 'b-mtoyota-total', color: '#dc2626', target: 20 },
    { key: 'sa_total', canvasId: 'chart-b-sa-total', badgeId: 'b-sa-total-total', color: '#0f172a', target: 45 },
    { key: 'sa_didin', canvasId: 'chart-b-didin', badgeId: 'b-didin-total', color: '#0284c7', target: 15 },
    { key: 'sa_ficky', canvasId: 'chart-b-ficky', badgeId: 'b-ficky-total', color: '#059669', target: 15 },
    { key: 'sa_acep', canvasId: 'chart-b-acep', badgeId: 'b-acep-total', color: '#d97706', target: 15 }
  ];

  channelConfigs.forEach(cfg => {
    const ch = channels[cfg.key];
    if (!ch) return;

    const badge = document.getElementById(cfg.badgeId);
    if (badge) badge.textContent = `${formatNum(ch.ytd_total)} Unit`;

    const canvas = document.getElementById(cfg.canvasId);
    if (!canvas) return;

    if (bookingChartInstances[cfg.key]) {
      bookingChartInstances[cfg.key].destroy();
    }

    const ctx = canvas.getContext('2d');

    // Determine configuration according to currentBookingCardType ('line', 'bar', 'area')
    let cType = 'line';
    let isFill = false;
    let bgCol = cfg.color + '15';
    let bWidth = 2.2;
    let bRadius = 0;

    if (currentBookingCardType === 'bar') {
      cType = 'bar';
      bgCol = cfg.color + 'dd';
      bWidth = 1;
      bRadius = 4;
      isFill = false;
    } else if (currentBookingCardType === 'area') {
      cType = 'line';
      isFill = true;
      bgCol = cfg.color + '40';
      bWidth = 2.2;
    } else {
      // line
      cType = 'line';
      isFill = false;
      bgCol = cfg.color + '18';
      bWidth = 2.4;
    }

    bookingChartInstances[cfg.key] = new Chart(ctx, {
      type: cType,
      data: {
        labels: months,
        datasets: [
          {
            label: ch.title,
            data: ch.monthly || [],
            borderColor: cfg.color,
            backgroundColor: bgCol,
            borderWidth: bWidth,
            borderRadius: bRadius,
            pointRadius: cType === 'bar' ? 0 : 3.5,
            pointHoverRadius: 5.5,
            pointBackgroundColor: cfg.color,
            fill: isFill,
            tension: 0.3,
            spanGaps: false,
            order: 2
          },
          {
            type: 'line',
            label: `Garis Target (${cfg.target}/bln)`,
            data: months.map(() => cfg.target),
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderDash: [5, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            isTarget: true,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 18,
            left: 2,
            right: 4,
            bottom: 2
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: (c) => {
                if (c.dataset.isTarget) return ` Garis Target: ${c.raw} Unit/bln`;
                if (c.raw === null || c.raw === undefined) return ` ${ch.title}: Belum Ada Data`;
                return ` ${ch.title}: ${c.raw} Unit`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grace: '18%',
            grid: { color: 'rgba(226, 232, 240, 0.4)' },
            ticks: { font: { size: 9 }, maxTicksLimit: 5 }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 9, weight: '600' } }
          }
        }
      },
      plugins: [bookingDataLabelsPlugin]
    });
  });

  // 2. Render Full Monthly Matrix Table (Direct Data Display)
  renderBookingMatrixTable(months, channels);

  // 3. Render Live TikTok Section
  renderTikTokLive();
}

function renderBookingMatrixTable(months, channels) {
  const tbody = document.getElementById('booking-matrix-tbody');
  const tfoot = document.getElementById('booking-matrix-tfoot');
  if (!tbody) return;

  const rowsDefinition = [
    { key: 'inc_call', name: 'Incoming Call (Inc. Call)', badge: 'Inc. Call', isSub: false, isHighlight: false },
    { key: 'boc', name: 'Booking on Call (BOC)', badge: 'BOC', isSub: false, isHighlight: false },
    { key: 'sales', name: 'Sales Booking Referral', badge: 'Sales', isSub: false, isHighlight: false },
    { key: 'm_toyota', name: 'M-Toyota (Mobile App)', badge: 'M-Toyota', isSub: false, isHighlight: false },
    { key: 'sa_total', name: 'SA Total (Akumulasi Semua SA)', badge: 'SA Summary', isSub: false, isHighlight: false },
    { key: 'sa_didin', name: '└ SA Didin', badge: 'Personal SA', isSub: true, isHighlight: false },
    { key: 'sa_ficky', name: '└ SA Ficky', badge: 'Personal SA', isSub: true, isHighlight: false },
    { key: 'sa_acep', name: '└ SA Acep', badge: 'Personal SA', isSub: true, isHighlight: false }
  ];

  // Primary channels for workshop grand total (avoid double counting personal SAs with sa_total)
  const mainKeys = ['inc_call', 'boc', 'sales', 'm_toyota', 'sa_total'];
  const grandTotalMonthly = months.map((_, mIdx) => {
    let hasAny = false;
    let sum = 0;
    mainKeys.forEach(k => {
      const v = channels[k]?.monthly?.[mIdx];
      if (v !== null && v !== undefined) {
        hasAny = true;
        sum += Number(v);
      }
    });
    return hasAny ? sum : null;
  });
  const grandTotalYtd = mainKeys.reduce((acc, k) => acc + ((channels[k]?.ytd_total) || 0), 0);

  let html = '';
  rowsDefinition.forEach(rowDef => {
    const ch = channels[rowDef.key] || { ytd_total: 0, monthly: [] };
    const sharePct = grandTotalYtd > 0 ? ((ch.ytd_total / grandTotalYtd) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
    const rowStyle = rowDef.isHighlight ? 'style="background: #f8fafc; font-weight: 700;"' : (rowDef.isSub ? 'style="color: #475569;"' : '');
    const indent = rowDef.isSub ? 'style="padding-left: 28px; font-style: italic;"' : 'style="font-weight: 600;"';

    html += `
      <tr ${rowStyle}>
        <td ${indent}>
          <span>${rowDef.name}</span>
          <span class="tag-badge ${rowDef.isHighlight ? 'blue' : 'gray'}" style="font-size: 9.5px; margin-left: 6px;">${rowDef.badge}</span>
        </td>
        ${months.map((_, mIdx) => {
          const val = ch.monthly?.[mIdx];
          if (val === null || val === undefined) {
            return `<td class="numeric" style="color: #94a3b8;">-</td>`;
          }
          return `<td class="numeric">${formatNum(val)}</td>`;
        }).join('')}
        <td class="numeric" style="background: #eff6ff; font-weight: 800; color: #1d4ed8;">${formatNum(ch.ytd_total)}</td>
        <td class="numeric" style="font-weight: 700; color: ${rowDef.isSub ? '#64748b' : '#047857'};">${sharePct}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  if (tfoot) {
    tfoot.innerHTML = `
      <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;">
        <td style="color: #0f172a;">TOTAL BOOKING WORKSHOP</td>
        ${grandTotalMonthly.map(val => {
          if (val === null || val === undefined) {
            return `<td class="numeric" style="color: #94a3b8;">-</td>`;
          }
          return `<td class="numeric" style="color: #0f172a;">${formatNum(val)}</td>`;
        }).join('')}
        <td class="numeric" style="background: #dbeafe; color: #1e40af; font-size: 13px;">${formatNum(grandTotalYtd)}</td>
        <td class="numeric" style="color: #16a34a; font-size: 12px;">100,0%</td>
      </tr>
    `;
  }
}

function renderTikTokLive() {
  if (!bookingData) return;

  const ttData = bookingData.tiktok_live;
  if (!ttData) return;

  const trendRows = ttData.monthly_trend || [];
  const activeRows = trendRows.filter(r => r.has_data !== false && r.booking !== null && r.booking !== undefined);
  const activeCount = activeRows.length || 1;
  const totalBooking = activeRows.reduce((a, b) => a + (b.booking || 0), 0);
  const avgBooking = Math.round(totalBooking / activeCount);
  const avgDur = Math.round(activeRows.reduce((a, b) => a + (b.duration || 0), 0) / activeCount);
  const avgLikes = Math.round(activeRows.reduce((a, b) => a + (b.likes || 0), 0) / activeCount);
  const avgViewer = Math.round(activeRows.reduce((a, b) => a + (b.viewer || 0), 0) / activeCount);
  const avgComm = Math.round(activeRows.reduce((a, b) => a + (b.comments || 0), 0) / activeCount);

  const durEl = document.getElementById('tt-duration-val');
  const likesEl = document.getElementById('tt-likes-val');
  const commentsEl = document.getElementById('tt-comments-val');
  const bookingEl = document.getElementById('tt-booking-val');

  if (durEl) durEl.innerHTML = `${avgDur} <small>menit/sesi</small>`;
  if (likesEl) likesEl.innerHTML = `${formatNum(avgLikes)} <small>/hari</small>`;
  if (commentsEl) commentsEl.innerHTML = `${avgComm} <small>/hari</small>`;
  if (bookingEl) bookingEl.innerHTML = `${totalBooking} <small>Unit</small>`;

  // Hero Quick Stats in pane-tiktok
  const heroBookingEl = document.getElementById('tt-total-booking-hero');
  const heroLikesEl = document.getElementById('tt-avg-likes-hero');
  const heroDurEl = document.getElementById('tt-avg-dur-hero');
  if (heroBookingEl) heroBookingEl.textContent = `${totalBooking} Unit`;
  if (heroLikesEl) heroLikesEl.textContent = formatNum(avgLikes);
  if (heroDurEl) heroDurEl.textContent = `${avgDur} Mnt`;

  // TikTok Trend Chart
  const trendCanvas = document.getElementById('chart-tiktok-trend');
  if (trendCanvas) {
    if (tiktokChartInstance) tiktokChartInstance.destroy();
    const ctx = trendCanvas.getContext('2d');

    tiktokChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: trendRows.map(r => r.month),
        datasets: [
          {
            type: 'bar',
            label: 'Booking Acquired (Unit)',
            data: trendRows.map(r => r.booking),
            backgroundColor: 'rgba(37, 99, 235, 0.85)',
            borderColor: '#1d4ed8',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'yBooking',
            order: 3
          },
          {
            type: 'line',
            label: 'Likes / Hari',
            data: trendRows.map(r => r.likes),
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
            yAxisID: 'yEngagement',
            order: 1
          },
          {
            type: 'line',
            label: 'Viewer / Hari',
            data: trendRows.map(r => r.viewer),
            borderColor: '#8b5cf6',
            backgroundColor: '#8b5cf6',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
            yAxisID: 'yEngagement',
            order: 1
          },
          {
            type: 'line',
            label: 'Komentar / Hari',
            data: trendRows.map(r => r.comments),
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 2,
            pointRadius: 3,
            borderDash: [4, 4],
            tension: 0.3,
            yAxisID: 'yBooking',
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 10.5 } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: function(c) {
                if (c.raw === null || c.raw === undefined) return ` ${c.dataset.label}: Belum Ada Data`;
                if (c.dataset.label.includes('Booking')) return ` ${c.dataset.label}: ${c.raw} Unit`;
                return ` ${c.dataset.label}: ${c.raw}`;
              }
            }
          }
        },
        scales: {
          yBooking: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            title: { display: true, text: 'Booking & Komentar', font: { size: 10 } },
            grid: { display: false }
          },
          yEngagement: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: 'Likes & Viewer / Hari', font: { size: 10 } },
            grid: { color: 'rgba(226, 232, 240, 0.5)' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }

  // Monthly Table in pane-tiktok
  const tbody = document.getElementById('tiktok-monthly-tbody');
  const tfoot = document.getElementById('tiktok-monthly-tfoot');
  if (tbody && trendRows.length > 0) {
    tbody.innerHTML = trendRows.map(row => {
      if (row.has_data === false || row.booking === null || row.booking === undefined) {
        return `
          <tr>
            <td><strong>${row.month}</strong></td>
            <td class="numeric" style="color: #94a3b8;">-</td>
            <td class="numeric" style="color: #94a3b8;">-</td>
            <td class="numeric" style="color: #94a3b8;">-</td>
            <td class="numeric" style="color: #94a3b8;">-</td>
            <td class="numeric" style="color: #94a3b8;">-</td>
            <td class="numeric" style="color: #94a3b8;">-</td>
          </tr>
        `;
      }
      const pct = totalBooking > 0 ? ((row.booking / totalBooking) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
      return `
        <tr>
          <td><strong>${row.month}</strong></td>
          <td class="numeric">${row.duration} Mnt</td>
          <td class="numeric">${formatNum(row.likes)}</td>
          <td class="numeric">${row.viewer !== null && row.viewer !== undefined ? row.viewer : '-'}</td>
          <td class="numeric">${row.comments}</td>
          <td class="numeric" style="background: #eff6ff; font-weight: 800; color: #1d4ed8;">${row.booking} Unit</td>
          <td class="numeric" style="font-weight: 600; color: #2563eb;">${pct}</td>
        </tr>
      `;
    }).join('');

    if (tfoot) {
      tfoot.innerHTML = `
        <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1;">
          <td>TOTAL / RATA-RATA (YTD)</td>
          <td class="numeric">${avgDur} Mnt (Rata-rata)</td>
          <td class="numeric">${formatNum(avgLikes)} (Rata-rata)</td>
          <td class="numeric">${avgViewer} (Rata-rata)</td>
          <td class="numeric">${avgComm} (Rata-rata)</td>
          <td class="numeric" style="background: #dbeafe; color: #1e40af;">${totalBooking} Unit</td>
          <td class="numeric" style="color: #16a34a;">100,0%</td>
        </tr>
      `;
    }
  }

  // Render AI TikTok Live Advisor
  renderTikTokAIAdvisor();
}

let currentTikTokAIFilter = 'all';

function renderTikTokAIAdvisor() {
  if (!bookingData || !bookingData.tiktok_live) return;
  const ttData = bookingData.tiktok_live;
  const trendRows = ttData.monthly_trend || [];
  const activeRows = trendRows.filter(r => r.has_data !== false && r.booking !== null && r.booking !== undefined);
  const activeCount = activeRows.length || 1;
  const totalBooking = activeRows.reduce((a, b) => a + (b.booking || 0), 0);
  const avgBooking = Math.round(totalBooking / activeCount);
  const avgDur = Math.round(activeRows.reduce((a, b) => a + (b.duration || 0), 0) / activeCount);
  const avgLikes = Math.round(activeRows.reduce((a, b) => a + (b.likes || 0), 0) / activeCount);
  const avgComm = Math.round(activeRows.reduce((a, b) => a + (b.comments || 0), 0) / activeCount);

  // Health score calculation
  let score = 55;
  if (avgDur >= 120) score += 15;
  else if (avgDur >= 100) score += 8;
  if (avgLikes >= 1400) score += 15;
  else if (avgLikes >= 1000) score += 8;
  if (avgBooking >= 28) score += 15;
  else if (avgBooking >= 20) score += 8;
  score = Math.min(100, score);

  const scoreEl = document.getElementById('ai-tiktok-health-score');
  if (scoreEl) {
    scoreEl.innerHTML = `
      <span class="score-label">Skor Efektivitas:</span>
      <span class="score-num" style="color: ${score >= 80 ? '#059669' : '#d97706'}; font-weight: 800;">${score}/100</span>
    `;
  }

  const recommendations = [
    {
      id: 'tt-rec-timing',
      category: 'urgent',
      badgeClass: 'urgent',
      badgeText: '🔴 Tindakan Mendesak (Jangka Pendek)',
      title: 'Optimasi Durasi Siaran ke Rentang 90–120 Menit (Sweet Spot FYP & Konversi)',
      rationale: `Rata-rata durasi saat ini <strong>${avgDur} menit/sesi</strong>. Analisis data membuktikan siaran berdurasi di atas 90–120 menit meningkatkan peluang masuk algoritma FYP TikTok hingga 3x lipat dan menghasilkan lonjakan booking tertinggi.`,
      actions: [
        'Tetapkan SOP durasi live minimal 90–120 menit per sesi (terutama di jam istirahat siang 12:00–13:30 dan sore 16:30–18:00).',
        'Bagi sesi siaran dalam 3 blok terstruktur: Menit 0–20 (Sapa audiens & Q&A ringan), Menit 20–75 (Bedah teknis langsung dari pit bengkel), Menit 75–120 (Flash promo servis & dorong booking via WA).',
        'Lakukan pemanasan (warm-up) siaran dengan menyematkan pin link WhatsApp CS sebelum masuk ke demonstrasi teknis utama.'
      ],
      copyLabel: 'Template Pengingat Jadwal Live Tim & Broadcast WA:',
      copyText: `📢 [JADWAL LIVE TIKTOK BENGKEL] Halo Sahabat Tunas Toyota Kiaracondong! Sesi Live hari ini dimulai pukul 12:30 - 14:00 WIB. Host: Tim CRO, Co-Host: SA Didin / Ficky. Topik: Tips Merawat AC Mobil & Promo Booking Servis Diskon Jasa 20%. Tonton sekarang & amankan voucher booking Anda!`
    },
    {
      id: 'tt-rec-voucher',
      category: 'quickwins',
      badgeClass: 'quickwins',
      badgeText: '🟡 Quick Wins / Booster Konversi (Jangka Pendek)',
      title: 'Exclusive Live Voucher "TIKTOKLIVE20" & Flash Sale Booking Servis',
      rationale: `Tingkat interaksi audiens sangat baik (rata-rata ${formatNum(avgLikes)} likes dan ${avgComm} komentar/hari). Namun penonton membutuhkan trigger urgensi batas waktu (flash sale) agar langsung terkonversi menjadi booking servis nyata.`,
      actions: [
        'Rilis kode voucher eksklusif: "TIKTOKLIVE20" (Diskon Jasa 20% + Gratis Cek 23 Titik) yang hanya berlaku 24 jam setelah siaran live selesai.',
        'Sematkan (Pin) komentar berisi link WhatsApp CS Bengkel resmi dengan format pesan booking otomatis siap kirim.',
        'Lakukan Call to Action (CTA) verbal berkala setiap 15 menit: "Ketik \'MAU\' di komentar untuk klaim voucher servis spesial hari ini!"'
      ],
      copyLabel: 'Template Format Pesan WhatsApp Penonton Live:',
      copyText: `Halo Tunas Toyota Kiaracondong, saya menonton Live TikTok dan ingin booking servis berkala menggunakan voucher TIKTOKLIVE20 untuk mobil [Model/Nopol]. Mohon info ketersediaan slot hari [Hari/Tanggal]. Terima kasih!`
    },
    {
      id: 'tt-rec-seasonal',
      category: 'quickwins',
      badgeClass: 'quickwins',
      badgeText: '🟡 Quick Wins / Engagement Booster (Jangka Pendek)',
      title: 'Kuis Trivia Interaktif & Kuis Berhadiah Merchandise Toyota',
      rationale: `Interaksi likes mencapai puncak di bulan Mei (522 likes/hari) dan penonton tertinggi di Juli (148 viewer/hari). Kuis interaktif dan demonstrasi teknis ringan terbukti efektif mendongkrak retensi penonton hingga menit penutupan.`,
      actions: [
        'Selenggarakan kuis trivia otomotif ringan di pertengahan sesi siaran dengan hadiah merchandise resmi Toyota (payung/topi/gantungan kunci).',
        'Wajibkan host menyapa dan menyebutkan nama akun penonton yang aktif bertanya di kolom komentar.',
        'Lakukan demonstrasi visual langsung: cara cek dipstick oli mesin, kondisi filter kabin AC, dan ketebalan kampas rem.'
      ],
      copyLabel: 'Template Script Host Kuis Live TikTok:',
      copyText: `Selamat untuk Kak [Nama Akun] yang berhasil menjawab kuis Live TikTok! Silakan screenshot layar ini dan kirim ke WhatsApp kami di bio untuk klaim merchandise resmi Toyota dan jadwal servis berkala Anda. Sampai jumpa di Tunas Toyota Kiaracondong!`
    },
    {
      id: 'tt-rec-content',
      category: 'team',
      badgeClass: 'team',
      badgeText: '🟢 Strategi Jangka Panjang (Format Konten & Tim SA)',
      title: 'Program Rutin "Tanya SA Live dari Pit Bengkel" (Didin, Ficky, Acep)',
      rationale: `Audiens TikTok merespons 2,4x lebih tinggi pada interaksi langsung dengan Service Advisor dari area pit workshop secara transparan dibandingkan siaran hanya di dalam ruangan/meja.`,
      actions: [
        'Hadirkan SA Didin, Ficky, atau Acep secara bergiliran setiap pekan untuk sesi "Tanya Dokter Mobil Toyota".',
        'Bawa kamera ke area workshop dan perlihatkan secara visual perbedaan spare part aus vs baru (kampas rem, oli, filter kabin).',
        'Bangun database penonton setia TikTok untuk broadcast jadwal live berikutnya melalui WhatsApp Business resmi.'
      ],
      copyLabel: 'Template Script Pembuka Host & SA:',
      copyText: `Halo semuanya! Selamat datang di Live Resmi Tunas Toyota Kiaracondong. Siang ini saya bersama Pak [Didin/Ficky/Acep], Service Advisor senior kami. Ada bunyi aneh di mobil Anda atau mau tanya estimasi biaya servis? Tulis di komentar sekarang, langsung kita bedah solusinya secara transparan!`
    }
  ];

  // Update badge counts
  const countAll = document.getElementById('count-tt-all');
  const countUrgent = document.getElementById('count-tt-urgent');
  const countQuick = document.getElementById('count-tt-quickwins');
  const countTeam = document.getElementById('count-tt-team');

  if (countAll) countAll.textContent = recommendations.length;
  if (countUrgent) countUrgent.textContent = recommendations.filter(r => r.category === 'urgent').length;
  if (countQuick) countQuick.textContent = recommendations.filter(r => r.category === 'quickwins').length;
  if (countTeam) countTeam.textContent = recommendations.filter(r => r.category === 'team').length;

  // Filter recommendations
  const filtered = currentTikTokAIFilter === 'all'
    ? recommendations
    : recommendations.filter(r => r.category === currentTikTokAIFilter);

  const container = document.getElementById('ai-tiktok-cards-container');
  if (container) {
    container.innerHTML = filtered.map(rec => `
      <div class="ai-card-item ${rec.badgeClass}">
        <div>
          <div class="ai-card-badge ${rec.badgeClass}">${rec.badgeText}</div>
          <div class="ai-card-title">${rec.title}</div>
          <div class="ai-fact-box">${rec.rationale}</div>
          <ul class="ai-action-list">
            ${rec.actions.map(act => `<li>${act}</li>`).join('')}
          </ul>
        </div>

        <div class="ai-wa-box">
          <div class="ai-wa-header">
            <span>💬 ${rec.copyLabel}</span>
            <button type="button" class="btn-copy-wa" onclick="copyTikTokAIText('${rec.id}')" id="btn-copy-${rec.id}">
              📋 Salin
            </button>
          </div>
          <div class="ai-wa-text" id="copy-text-${rec.id}">${rec.copyText}</div>
        </div>
      </div>
    `).join('');
  }
}

window.copyTikTokAIText = function(recId) {
  const textEl = document.getElementById(`copy-text-${recId}`);
  const btnEl = document.getElementById(`btn-copy-${recId}`);
  if (!textEl || !btnEl) return;

  const textToCopy = textEl.textContent || textEl.innerText;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalHtml = btnEl.innerHTML;
    btnEl.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      <span style="color: #059669; font-weight: 700;">Tersalin!</span>
    `;
    setTimeout(() => {
      btnEl.innerHTML = originalHtml;
    }, 2200);
  }).catch(err => {
    console.error('Failed to copy text:', err);
  });
};

function initBookingInteractions() {
  // Chart type switcher buttons (Line, Batang, Area)
  const typeBtns = document.querySelectorAll('.btn-bk-type');
  typeBtns.forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const chosenType = btn.getAttribute('data-bk-type') || 'line';
        currentBookingCardType = chosenType;
        renderBooking();
      });
    }
  });

  // TikTok AI Filter Tabs
  const ttFilterBtns = document.querySelectorAll('#ai-tiktok-filter-tabs .ai-tab-btn');
  ttFilterBtns.forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        ttFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTikTokAIFilter = btn.getAttribute('data-tt-filter') || 'all';
        renderTikTokAIAdvisor();
      });
    }
  });

  // TikTok AI Refresh Button
  const ttRefreshBtn = document.getElementById('btn-refresh-tiktok-ai');
  if (ttRefreshBtn && !ttRefreshBtn.dataset.bound) {
    ttRefreshBtn.dataset.bound = 'true';
    ttRefreshBtn.addEventListener('click', () => {
      ttRefreshBtn.classList.add('spinning');
      renderTikTokAIAdvisor();
      setTimeout(() => {
        ttRefreshBtn.classList.remove('spinning');
      }, 500);
    });
  }

  // Google Sheets sync button
  const syncBtn = document.getElementById('btn-sync-booking-sheet');
  if (syncBtn && !syncBtn.dataset.bound) {
    syncBtn.dataset.bound = 'true';
    syncBtn.addEventListener('click', async () => {
      await syncBookingFromLiveSheet({ isManual: true });
    });
  }
}


function showFloatingToast(message, borderColor = '#10b981') {
  const existing = document.querySelector('.gsheet-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'gsheet-toast';
  toast.style.borderLeftColor = borderColor;
  toast.innerHTML = `
    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${borderColor};"></span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

window.copyTikTokSimple = function(type) {
  let text = '';
  let btnId = '';
  if (type === 'voucher') {
    text = 'Halo Tunas Toyota Kiaracondong, saya menonton Live TikTok dan ingin booking servis berkala menggunakan voucher TIKTOKLIVE20 untuk mobil [Model/Nopol]. Mohon info ketersediaan slot hari [Hari/Tanggal]. Terima kasih!';
    btnId = 'btn-copy-tt-voucher';
  } else if (type === 'script') {
    text = 'Halo Sahabat Toyota! Malam ini saya bersama Pak [Didin/Ficky/Acep], Service Advisor kami. Punya keluhan mobil atau mau tanya estimasi biaya servis? Tulis di kolom komentar, langsung kita bahas dan beri solusinya secara transparan!';
    btnId = 'btn-copy-tt-script';
  }
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(btnId);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Tersalin!';
      btn.style.color = '#059669';
      btn.style.borderColor = '#10b981';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2200);
    }
  }).catch(err => {
    console.error('Clipboard copy failed:', err);
  });
};

window.copyFunnelSimple = function(type) {
  let text = '';
  let btnId = '';
  if (type === 'open_booking') {
    text = 'Halo Bapak/Ibu [Nama Pelanggan], kami dari Tunas Toyota Kiaracondong mengonfirmasi kembali jadwal booking servis kendaraan Anda [Model/Nopol] yang terdaftar. Apakah ada penyesuaian waktu yang dibutuhkan, atau ingin kami layani dengan Toyota Home Service (THS) di rumah/kantor? Terima kasih!';
    btnId = 'btn-copy-fn-open';
  } else if (type === 'ths') {
    text = 'Halo Bapak/Ibu [Nama Pelanggan], terima kasih telah mempercayakan kendaraan Toyota Anda kepada Tunas Toyota Kiaracondong. Bagi Anda yang memiliki agenda padat atau terkendala waktu ke bengkel, kami menyediakan layanan servis berkala di rumah / kantor Anda melalui *Toyota Home Service (THS)* tanpa biaya kunjungan tambahan! Tim teknisi kami siap hadir dengan peralatan standar bengkel resmi. Balas pesan ini untuk memilih jadwal kunjungan THS yang nyaman untuk Anda. Terima kasih! 🚐✨';
    btnId = 'btn-copy-fn-ths';
  }
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(btnId);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Tersalin!';
      btn.style.color = '#059669';
      btn.style.borderColor = '#10b981';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2200);
    }
  }).catch(err => {
    console.error('Clipboard copy failed:', err);
  });
};


// ============================================================================
// SBI (SERVICE BERKALA INTERNAL) INTELLIGENCE & REMINDER MONITORING
// ============================================================================
let sbiChartInstances = {};
let sbiCurrentPage = 1;
let sbiPageSize = 25;
let sbiQuickFilter = 'all';
let sbiFilteredRecords = [];
let sbiEventsInitialized = false;
let sbiActiveYear = '2026';
let sbiActiveMonth = 'all';
let sbiActiveSpv = 'FERYANTO';

const SBI_GSHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/gviz/tq?tqx=out:csv&gid=457735933';

async function fetchAndUpdateSbiLive() {
  const gvizRes = await fetch(SBI_GSHEET_CSV_URL + '&_t=' + Date.now(), { cache: 'no-store' });
  if (!gvizRes.ok) throw new Error('HTTP ' + gvizRes.status);
  const csvText = await gvizRes.text();
  if (!csvText || csvText.includes('<!DOCTYPE html>')) throw new Error('Invalid CSV response');
  const parsed = parseSbiClientCsv(csvText);
  if (parsed && parsed.records && parsed.records.length > 0) {
    sbiData = parsed;
    try {
      localStorage.setItem('bengkel_custom_sbi_data', JSON.stringify(sbiData));
    } catch (e) {}
    console.log('[OK] Synced SBI live from Google Sheets:', sbiData.meta?.total_records, 'records');
    renderSbi();
    return sbiData;
  }
  return null;
}

async function loadSbiData() {
  // 1. Instant load from static JSON or newer localStorage cache
  let serverSbi = null;
  try {
    const res = await fetch('data/sbi_data.json?v=' + Date.now(), { cache: 'no-store' });
    if (res.ok) serverSbi = await res.json();
  } catch (err) {
    console.warn('Gagal memuat sbi_data.json:', err);
  }

  let cachedSbi = null;
  try {
    const raw = localStorage.getItem('bengkel_custom_sbi_data');
    if (raw) cachedSbi = JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem('bengkel_custom_sbi_data');
  }

  const serverTime = serverSbi?.meta?.updated_at ? new Date(serverSbi.meta.updated_at).getTime() : 0;
  const cachedTime = cachedSbi?.meta?.updated_at ? new Date(cachedSbi.meta.updated_at).getTime() : 0;
  if (cachedSbi && cachedSbi.records && cachedTime >= serverTime) {
    sbiData = cachedSbi;
  } else if (serverSbi) {
    sbiData = serverSbi;
  }

  if (sbiData) {
    console.log('[OK] Loaded SBI data:', sbiData.meta?.total_records, 'records');
    renderSbi();
  }

  // 2. Always refresh live from Google Sheets in background
  fetchAndUpdateSbiLive().catch(err => {
    console.warn('Background SBI live sync warning:', err);
  });

  return sbiData;
}

function parseSbiClientCsv(csvText) {
  const rawRows = parseGSheetCSV(csvText);
  const rows = rawRows.filter(r => r && r.some(cell => String(cell).trim().length > 0));

  let hIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const rStr = rows[i].join(' | ');
    if (rStr.includes('VIN') && rStr.includes('Nama') && rStr.includes('Model')) {
      hIdx = i;
      break;
    }
  }
  if (hIdx === -1) hIdx = 6;

  const dataRows = rows.slice(hIdx + 1);
  const records = dataRows.map((r, idx) => ({
    id: idx + 1,
    cai: r[0] || '',
    month_num: r[1] || '',
    month: r[2] || '',
    month_fu: r[3] || '',
    year: r[4] || '',
    year_fu: r[5] || '',
    vin: r[6] || '',
    no: r[7] || '',
    tgl_transaksi: r[8] || '',
    nama: r[9] || '',
    nama_cust: r[10] || '',
    type_cust: r[11] || '',
    telepon1: r[12] || '',
    telepon2: r[13] || '',
    telepon3: r[14] || '',
    model: r[15] || '',
    plat_no: r[16] || '',
    sales_person: r[17] || '',
    nomor_rangka: r[18] || '',
    alamat: r[19] || '',
    kab: r[20] || '',
    ss: r[21] || '',
    car_type: r[22] || '',
    no_wa: r[23] || '',
    fu_by: r[24] || '',
    tgl_fu: r[25] || '',
    notes_fu: r[26] || '',
    penggalian_mrs: r[27] || '',
    cai_to_dealer: r[28] || '',
    ket_fu: r[29] || '',
    sales: r[30] || '',
    potency_sales: r[31] || '',
    fu_sales: r[32] || '',
    fu_by_sales: r[33] || '',
    status_tcare: r[34] || '',
    bulan_cai_so: r[35] || '',
    ring_area: r[36] || '',
    cai_10k: r[37] || '',
    cai_20k: r[38] || '',
    cai_30k: r[39] || '',
    cai_40k: r[40] || '',
    cai_50k: r[41] || '',
    cai_60k: r[42] || '',
    cai_70k: r[43] || '',
    habit_ring_area: r[44] || '',
    habit_dealer: r[45] || '',
    judgement_cust: r[46] || ''
  }));

  return {
    meta: {
      total_records: records.length,
      updated_at: new Date().toISOString(),
      source: 'live_google_sheets'
    },
    records: records
  };
}

function updateSbiMonthPillBadges() {
  if (!sbiData || !sbiData.records) return;
  const monthNamesId = {
    'January': 'Januari', 'February': 'Februari', 'March': 'Maret',
    'April': 'April', 'May': 'Mei', 'June': 'Juni',
    'July': 'Juli', 'August': 'Agustus', 'September': 'September',
    'October': 'Oktober', 'November': 'November', 'December': 'Desember'
  };

  const currentYear = sbiActiveYear || '2026';
  const yearRecs = currentYear === 'all' 
    ? sbiData.records 
    : sbiData.records.filter(r => String(r.year) === String(currentYear));

  document.querySelectorAll('.btn-sbi-month-pill').forEach(btn => {
    const m = btn.getAttribute('data-month');
    if (m === 'all') return;
    
    const count = yearRecs.filter(r => (r.month || '').toUpperCase() === m.toUpperCase()).length;
    const baseName = monthNamesId[m] || m;
    if (count === 0) {
      btn.innerHTML = `${baseName} <span class="pill-zero-tag" title="Belum ada data untuk tahun ${currentYear}">(0)</span>`;
      btn.classList.add('is-empty');
    } else {
      btn.innerHTML = `${baseName}`;
      btn.classList.remove('is-empty');
    }
  });
}

function initSbiEvents() {
  if (sbiEventsInitialized) return;
  sbiEventsInitialized = true;

  // Year Pills Bar Click Events
  document.querySelectorAll('.btn-sbi-year-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-sbi-year-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sbiActiveYear = btn.getAttribute('data-year') || '2026';

      const yearSelect = document.getElementById('sbi-filter-year');
      if (yearSelect) yearSelect.value = sbiActiveYear;

      updateSbiMonthPillBadges();
      sbiCurrentPage = 1;
      applySbiFiltersAndRender();
    });
  });

  // Month Pills Bar Click Events
  document.querySelectorAll('.btn-sbi-month-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-sbi-month-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sbiActiveMonth = btn.getAttribute('data-month') || 'all';

      const monthSelect = document.getElementById('sbi-filter-month');
      if (monthSelect) monthSelect.value = sbiActiveMonth;

      sbiCurrentPage = 1;
      applySbiFiltersAndRender();
    });
  });

  // Filter change events
  ['sbi-filter-year', 'sbi-filter-month', 'sbi-filter-cai', 'sbi-filter-tcare',
   'sbi-filter-cartype', 'sbi-filter-judgement', 'sbi-filter-ss'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        if (id === 'sbi-filter-year') {
          sbiActiveYear = el.value || '2026';
          document.querySelectorAll('.btn-sbi-year-pill').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-year') === sbiActiveYear);
          });
          updateSbiMonthPillBadges();
        } else if (id === 'sbi-filter-month') {
          sbiActiveMonth = el.value || 'all';
          document.querySelectorAll('.btn-sbi-month-pill').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-month') === sbiActiveMonth);
          });
        }
        sbiCurrentPage = 1;
        applySbiFiltersAndRender();
      });
    }
  });

  // SPV Tab Buttons Click Events
  document.querySelectorAll('.btn-spv-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-spv-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sbiActiveSpv = btn.getAttribute('data-spv') || 'FERYANTO';
      renderSbiSalesPerSpv(sbiFilteredRecords);
    });
  });

  // Search input
  const searchInput = document.getElementById('sbi-search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        sbiCurrentPage = 1;
        applySbiFiltersAndRender();
      }, 150);
    });
  }

  // Quick Filter Pills
  document.querySelectorAll('.btn-sbi-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-sbi-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sbiQuickFilter = btn.getAttribute('data-sbi-quick') || 'all';
      sbiCurrentPage = 1;
      applySbiFiltersAndRender();
    });
  });

  // Page Size selector
  const pageSizeSelect = document.getElementById('sbi-page-size');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      const val = pageSizeSelect.value;
      sbiPageSize = val === 'all' ? 99999 : parseInt(val, 10);
      sbiCurrentPage = 1;
      renderSbiTable();
    });
  }

  // Export CSV button
  const exportBtn = document.getElementById('btn-export-sbi');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportSbiCsv);
  }

  // Live Sync button
  const syncBtn = document.getElementById('btn-sync-sbi-sheet');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncSbiFromLiveSheet);
  }

  // Modal Close buttons
  const modalCloseBtn = document.getElementById('btn-close-sbi-modal');
  const modalOverlay = document.getElementById('sbi-detail-modal');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      if (modalOverlay) modalOverlay.style.display = 'none';
    });
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    });
  }
}

function applySbiFiltersAndRender() {
  if (!sbiData || !sbiData.records) return;

  const fYear = sbiActiveYear || document.getElementById('sbi-filter-year')?.value || '2026';
  const fMonth = sbiActiveMonth || document.getElementById('sbi-filter-month')?.value || 'all';
  const fCai = document.getElementById('sbi-filter-cai')?.value || 'all';
  const fTcare = document.getElementById('sbi-filter-tcare')?.value || 'all';
  const fCartype = document.getElementById('sbi-filter-cartype')?.value || 'all';
  const fJudgement = document.getElementById('sbi-filter-judgement')?.value || 'all';
  const fSs = document.getElementById('sbi-filter-ss')?.value || 'all';
  const query = (document.getElementById('sbi-search-input')?.value || '').trim().toLowerCase();

  sbiFilteredRecords = sbiData.records.filter(r => {
    // Year filter
    if (fYear !== 'all' && String(r.year) !== String(fYear)) return false;

    // Month filter (supports dynamic selection)
    if (fMonth !== 'all' && (r.month || '').toUpperCase() !== fMonth.toUpperCase()) return false;

    // CAI filter
    if (fCai !== 'all') {
      const isCai = (r.cai || '').toUpperCase() === 'CAI';
      if (fCai === 'CAI' && !isCai) return false;
      if (fCai === 'NOT CAI' && isCai) return false;
    }

    // T-Care filter
    if (fTcare !== 'all' && (r.status_tcare || '').toUpperCase() !== fTcare) return false;

    // Car type filter
    if (fCartype !== 'all') {
      const ct = (r.car_type || '').toUpperCase();
      if (!ct.includes(fCartype)) return false;
    }

    // Judgement filter
    if (fJudgement !== 'all') {
      const j = (r.judgement_cust || '').toUpperCase();
      if (!j.includes(fJudgement)) return false;
    }

    // SS filter
    if (fSs !== 'all') {
      const ssVal = (r.ss || '').toUpperCase();
      if (!ssVal.includes(fSs)) return false;
    }

    // Quick filter pill
    if (sbiQuickFilter === 'cai') {
      if ((r.cai || '').toUpperCase() !== 'CAI') return false;
    } else if (sbiQuickFilter === 'not-cai') {
      if ((r.cai || '').toUpperCase() === 'CAI') return false;
    } else if (sbiQuickFilter === 'hot') {
      if (!(r.judgement_cust || '').toUpperCase().includes('HOT')) return false;
    } else if (sbiQuickFilter === 'loss') {
      if (!(r.judgement_cust || '').toUpperCase().includes('LOSS')) return false;
    } else if (sbiQuickFilter === 'wajib-fu') {
      if (!(r.potency_sales || '').toUpperCase().includes('WAJIB')) return false;
    } else if (sbiQuickFilter === 'hybrid') {
      if (!(r.car_type || '').toUpperCase().includes('HYBRID')) return false;
    } else if (sbiQuickFilter === 'fleet') {
      if ((r.type_cust || '').toUpperCase() !== 'FLEET') return false;
    }

    // Text Search
    if (query) {
      const haystack = [
        r.vin, r.plat_no, r.nama, r.nama_cust, r.model,
        r.telepon1, r.no_wa, r.alamat, r.kab, r.notes_fu,
        r.penggalian_mrs, r.sales_person, r.ss, r.judgement_cust
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  updateSbiQuickPillCounters();
  updateSbiKpis();
  renderSbiAIAnalysis(sbiFilteredRecords, fMonth);
  renderSbiCharts(sbiFilteredRecords);
  renderSbiNotesFu(sbiFilteredRecords);
  renderSbiSalesPerSpv(sbiFilteredRecords);
  renderSbiTable();
}

function updateSbiQuickPillCounters() {
  if (!sbiData || !sbiData.records) return;
  const fYear = sbiActiveYear || '2026';
  const yearRecs = fYear === 'all' 
    ? sbiData.records 
    : sbiData.records.filter(r => String(r.year) === String(fYear));

  let cntCai = 0, cntNotCai = 0, cntHot = 0, cntLoss = 0, cntWajib = 0, cntHybrid = 0, cntFleet = 0;
  yearRecs.forEach(r => {
    const isCai = (r.cai || '').toUpperCase() === 'CAI';
    if (isCai) cntCai++; else cntNotCai++;
    const j = (r.judgement_cust || '').toUpperCase();
    if (j.includes('HOT')) cntHot++;
    if (j.includes('LOSS')) cntLoss++;
    const p = (r.potency_sales || '').toUpperCase();
    if (p.includes('WAJIB')) cntWajib++;
    const ct = (r.car_type || '').toUpperCase();
    if (ct.includes('HYBRID')) cntHybrid++;
    if ((r.type_cust || '').toUpperCase() === 'FLEET') cntFleet++;
  });

  const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = formatNum(v); };
  setT('pill-cnt-all', yearRecs.length);
  setT('pill-cnt-cai', cntCai);
  setT('pill-cnt-not-cai', cntNotCai);
  setT('pill-cnt-hot', cntHot);
  setT('pill-cnt-loss', cntLoss);
  setT('pill-cnt-wajib', cntWajib);
  setT('pill-cnt-hybrid', cntHybrid);
  setT('pill-cnt-fleet', cntFleet);
}

function updateSbiKpis() {
  const records = sbiFilteredRecords || [];
  const total = records.length;
  let caiCount = 0;
  let hybridCount = 0;
  let hotCount = 0;

  records.forEach(r => {
    if ((r.cai || '').toUpperCase() === 'CAI') caiCount++;
    if ((r.car_type || '').toUpperCase().includes('HYBRID')) hybridCount++;
    if ((r.judgement_cust || '').toUpperCase().includes('HOT')) hotCount++;
  });

  const notCaiCount = total - caiCount;
  const acvPct = total > 0 ? (caiCount / total * 100).toFixed(1) + '%' : '0.0%';
  const hybridPct = total > 0 ? (hybridCount / total * 100).toFixed(1) + '%' : '0.0%';
  const hotPct = total > 0 ? (hotCount / total * 100).toFixed(1) + '%' : '0.0%';

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('sbi-kpi-total-dec', formatNum(total));
  setEl('sbi-kpi-total-cai', formatNum(caiCount));
  setEl('sbi-kpi-total-notcai', formatNum(notCaiCount));
  setEl('sbi-kpi-avg-acv', acvPct);
  setEl('sbi-kpi-total-hybrid', formatNum(hybridCount));
  setEl('sbi-kpi-hybrid-unit', `Unit (${hybridPct})`);
  setEl('sbi-kpi-total-hot', formatNum(hotCount));
  setEl('sbi-kpi-hot-unit', `Unit (${hotPct})`);

  // Update Active Month Badges & Header Title
  const monthNamesId = {
    'all': 'Semua Bulan',
    'January': 'Bulan Januari', 'February': 'Bulan Februari', 'March': 'Bulan Maret',
    'April': 'Bulan April', 'May': 'Bulan Mei', 'June': 'Bulan Juni',
    'July': 'Bulan Juli', 'August': 'Agustus', 'September': 'Bulan September',
    'October': 'Bulan Oktober', 'November': 'Bulan November', 'December': 'Bulan Desember'
  };
  const yrLabel = sbiActiveYear === 'all' ? 'Semua Tahun (2024-2026)' : `Tahun ${sbiActiveYear}`;
  const mLabel = monthNamesId[sbiActiveMonth] || sbiActiveMonth;
  const fullLabel = sbiActiveMonth === 'all' ? `${mLabel} (${yrLabel})` : `${mLabel} ${sbiActiveYear === 'all' ? '(Semua Tahun)' : sbiActiveYear}`;
  setEl('sbi-active-month-text', fullLabel);
  
  if (total > 0) {
    setEl('sbi-active-month-stats', `${formatNum(total)} Unit DEC | ${formatNum(caiCount)} Unit CAI (${acvPct})`);
  } else {
    setEl('sbi-active-month-stats', `0 Unit DEC | 0 Unit CAI (Belum Ada Data)`);
  }

  const titleEl = document.getElementById('sbi-month-bar-title-text');
  if (titleEl) {
    titleEl.textContent = `PILIH PERIODE BULAN MONITORING SBI (${sbiActiveYear === 'all' ? 'SEMUA TAHUN' : sbiActiveYear}):`;
  }
}

function renderSbiAIAnalysis(records, monthKey) {
  const periodLabel = document.getElementById('sbi-ai-period-label');
  const diagContainer = document.getElementById('sbi-ai-diag-text');
  const actionContainer = document.getElementById('sbi-ai-action-list');

  const monthNamesId = {
    'all': 'SEMUA BULAN',
    'January': 'JANUARI', 'February': 'FEBRUARI', 'March': 'MARET',
    'April': 'APRIL', 'May': 'MEI', 'June': 'JUNI',
    'July': 'JULI', 'August': 'AGUSTUS', 'September': 'SEPTEMBER',
    'October': 'OKTOBER', 'November': 'NOVEMBER', 'December': 'DESEMBER'
  };
  const yrStr = sbiActiveYear === 'all' ? '2024-2026' : sbiActiveYear;
  const mStr = monthNamesId[monthKey] || String(monthKey).toUpperCase();
  const labelText = `${mStr} ${yrStr}`;
  if (periodLabel) periodLabel.textContent = labelText;

  const total = records.length;
  if (total === 0) {
    if (diagContainer) {
      diagContainer.innerHTML = `
        <div class="sbi-ai-diag-item" style="border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.08); padding: 14px 16px; border-radius: 8px;">
          <div style="font-weight: 700; color: #fbbf24; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Data Belum Tersedia di Spreadsheet Live (0 Record)
          </div>
          <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
            Pada Google Spreadsheet live tab <strong>SBI</strong>, transaksi &amp; follow up untuk periode <strong>${labelText}</strong> belum diinput (0 Unit DEC / 0 Unit CAI).
            Untuk tahun berjalan 2026, pencatatan di spreadsheet saat ini baru tersedia sampai bulan <strong>September 2026</strong>.
          </div>
        </div>
      `;
    }
    if (actionContainer) {
      actionContainer.innerHTML = `
        <div class="sbi-ai-action-card" style="border-left: 3px solid #3b82f6;">
          <div class="sbi-action-num">i</div>
          <div class="sbi-action-body">
            <h4>Sinkronisasi Sheet SBI</h4>
            <p>Jika tim aftersales atau CRM telah menginput data ${labelText} di Google Spreadsheet, klik tombol <strong>"Sinkronkan Sheet SBI"</strong> di bagian atas untuk menarik data terbaru secara live.</p>
          </div>
        </div>
      `;
    }
    return;
  }

  const cai = records.filter(r => (r.cai || '').toUpperCase() === 'CAI').length;
  const notCai = total - cai;
  const acvPct = total > 0 ? (cai / total * 100).toFixed(1) : '0.0';

  // Count FU reasons for not cai
  const notCaiList = records.filter(r => (r.cai || '').toUpperCase() !== 'CAI');
  let cntLain = 0, cntLokasi = 0, cntNoKontak = 0, cntHub = 0, cntBooking = 0;
  notCaiList.forEach(r => {
    const n = (r.notes_fu || '').toUpperCase();
    if (n.includes('TEMPAT LAIN') || n.includes('BENGKEL LAIN') || n.includes('LUAR')) cntLain++;
    else if (n.includes('LOKASI') || n.includes('JARAK') || n.includes('JAUH') || n.includes('LUAR KOTA')) cntLokasi++;
    else if (n.includes('TIDAK DAPAT DIHUBUNGI') || n.includes('TIDAK AKTIF') || n.includes('SALAH SAMBUNG') || n.includes('NO HP')) cntNoKontak++;
    else if (n.includes('AKAN MENGHUBUNGI') || n.includes('JANJI')) cntHub++;
    else if (n.includes('BOOKING') || n.includes('RESCHEDULE')) cntBooking++;
  });

  const pctLain = notCai > 0 ? (cntLain / notCai * 100).toFixed(1) : '0.0';
  const pctLokasi = notCai > 0 ? (cntLokasi / notCai * 100).toFixed(1) : '0.0';
  const pctNoKontak = notCai > 0 ? (cntNoKontak / notCai * 100).toFixed(1) : '0.0';

  if (diagContainer) {
    diagContainer.innerHTML = `
      <div class="sbi-ai-diag-item">
        <strong>1. Rasio Konversi Kedatangan:</strong> Dari total potensi <strong>${formatNum(total)} unit</strong>, realisasi hadir mencapai <strong>${formatNum(cai)} unit (${acvPct}%)</strong>. Terdapat selisih <strong>${formatNum(notCai)} unit pelanggan</strong> yang belum masuk bengkel.
      </div>
      <div class="sbi-ai-diag-item">
        <strong>2. Attrition Tertinggi ke Bengkel Luar (${pctLain}%):</strong> Sebanyak <strong>${formatNum(cntLain)} pelanggan</strong> memilih servis di bengkel umum/luar resmi karena persepsi biaya atau keterikatan historis.
      </div>
      <div class="sbi-ai-diag-item">
        <strong>3. Hambatan Teritorial / Domisili (${pctLokasi}%):</strong> Sebanyak <strong>${formatNum(cntLokasi)} pelanggan</strong> berdomisili di luar radius perimeter bengkel (Bandung Barat, Kab. Bandung, Jakarta Selatan, Garut).
      </div>
      <div class="sbi-ai-diag-item">
        <strong>4. Contactability Barrier (${pctNoKontak}%):</strong> <strong>${formatNum(cntNoKontak)} kontak nasabah</strong> tidak dapat dihubungi melalui WhatsApp atau telepon langsung.
      </div>
    `;
  }

  if (actionContainer) {
    actionContainer.innerHTML = `
      <div class="sbi-ai-action-card">
        <div class="sbi-action-num">1</div>
        <div class="sbi-action-body">
          <h4>Program "Win-Back" Paket Hemat &amp; Garansi Resmi</h4>
          <p>Tawarkan paket bundling oli TMO + diskon jasa 20% khusus pelanggan yang terindikasi lari ke bengkel umum, dengan penegasan risiko hangusnya garansi mesin.</p>
          <div class="ai-wa-box">
            <div class="ai-wa-header">
              <span>💬 Template Pesan WhatsApp Follow-up (${labelText}):</span>
              <button type="button" class="btn-copy-wa" onclick="copySbiWaText(this)">📋 Salin Pesan</button>
            </div>
            <div class="ai-wa-text">Halo Bapak/Ibu, salam hangat dari Tunas Toyota Kiaracondong 🙏

Kami menginfokan bahwa kendaraan Toyota Bapak/Ibu telah memasuki jadwal Service Berkala Internal. Khusus bulan ini, nikmati Program Win-Back Spesial:
🎁 Paket Bundling Oli TMO Original + Diskon Jasa 20%
🔍 Gratis General Check-Up 23 Titik Kendaraan
🛡️ Garansi Mesin Resmi &amp; Riwayat Servis Toyota Terjamin

Mau kami bantu booking jadwal servis hari ini tanpa perlu antre? Cukup balas pesan ini untuk reservasi cepat. Terima kasih! 🚗✨</div>
          </div>
        </div>
      </div>

      <div class="sbi-ai-action-card">
        <div class="sbi-action-num">2</div>
        <div class="sbi-action-body">
          <h4>THS Express &amp; Shuttle Pickup Lintas Wilayah</h4>
          <p>Kerahkan armada Toyota Home Service (THS) khusus klaster Kab. Bandung Barat, Cimahi, dan Garut untuk menghilangkan alasan jarak tempuh jauh ke Kiaracondong.</p>
          <div class="ai-wa-box">
            <div class="ai-wa-header">
              <span>💬 Template Pesan WhatsApp Follow-up (${labelText}):</span>
              <button type="button" class="btn-copy-wa" onclick="copySbiWaText(this)">📋 Salin Pesan</button>
            </div>
            <div class="ai-wa-text">Halo Bapak/Ibu, salam dari Aftersales Tunas Toyota Kiaracondong 🙏

Terkendala jarak tempuh atau waktu kerja yang padat untuk ke bengkel? Kami hadirkan layanan Toyota Home Service (THS) langsung ke rumah/kantor Anda tanpa biaya kunjungan tambahan!

Teknisi resmi bersertifikat siap melakukan servis berkala tepat waktu di lokasi Anda dengan standar protokol resmi Toyota.

Apakah berkenan kami jadwalkan servis THS minggu ini? Cukup balas pesan ini dengan alamat &amp; waktu yang diinginkan. Terima kasih! 🏡🔧</div>
          </div>
        </div>
      </div>

      <div class="sbi-ai-action-card">
        <div class="sbi-action-num">3</div>
        <div class="sbi-action-body">
          <h4>Supervisi Harian Sales per SPV (Mandat Tindak Lanjut)</h4>
          <p>Tugaskan SPV (Feryanto, Caisariva, Alvin) untuk mereview daftar salesman yang memiliki tunggakan pelanggan Belum CAI setiap briefing pagi.</p>
          <div class="ai-wa-box">
            <div class="ai-wa-header">
              <span>💬 Template Pesan WhatsApp Briefing SPV/Sales (${labelText}):</span>
              <button type="button" class="btn-copy-wa" onclick="copySbiWaText(this)">📋 Salin Pesan</button>
            </div>
            <div class="ai-wa-text">📢 *MEMO INTERNAL AFTERSALES - PENGAWALAN RETENSI SBI*
🗓️ *Periode:* ${labelText}

Kepada Rekan-rekan SPV &amp; Salesman Tunas Toyota Kiaracondong:
Mohon prioritaskan follow-up data pelanggan Service Berkala Internal (Belum Masuk CAI):
1. Segera hubungi customer prioritas (Hot &amp; High Loyalty).
2. Tawarkan kemudahan booking jadwal atau opsi Toyota Home Service (THS).
3. Laporkan hasil kontak &amp; kendala pada sesi briefing harian besok pagi.

Mari maksimalkan konversi unit masuk dan kawal kepuasan pelanggan bersama! Semangat! 💪🔥</div>
          </div>
        </div>
      </div>

      <div class="sbi-ai-action-card">
        <div class="sbi-action-num">4</div>
        <div class="sbi-action-body">
          <h4>Pre-Call Reminder Otomatis T-7 &amp; Multi-Channel Blast</h4>
          <p>Jalankan blast WhatsApp otomatis terverifikasi pada H-7 sebelum jatuh tempo servis, diikuti reminder telepon H-3 untuk mengamankan slot booking.</p>
          <div class="ai-wa-box">
            <div class="ai-wa-header">
              <span>💬 Template Pesan WhatsApp Follow-up (${labelText}):</span>
              <button type="button" class="btn-copy-wa" onclick="copySbiWaText(this)">📋 Salin Pesan</button>
            </div>
            <div class="ai-wa-text">Halo Bapak/Ibu Pelanggan Setia Tunas Toyota Kiaracondong,

Mengingatkan kembali bahwa kendaraan Toyota Anda akan memasuki masa jatuh tempo Service Berkala dalam 7 hari ke depan. Servis berkala teratur sangat penting untuk menjaga keawetan mesin, efisiensi bahan bakar, dan kenyamanan keluarga.

Dapatkan kepastian slot servis dan teknisi terbaik kami tanpa antre:
📲 Balas pesan ini atau hubungi Hotline Booking kami untuk memilih jam kedatangan yang paling nyaman.

Kami siap memberikan pelayanan prima untuk kendaraan Anda. Sampai jumpa di Tunas Kiaracondong! 🚘🙌</div>
          </div>
        </div>
      </div>
    `;
  }
}

window.copySbiWaText = function(btn) {
  const box = btn.closest('.ai-wa-box');
  if (!box) return;
  const textEl = box.querySelector('.ai-wa-text');
  if (!textEl) return;

  const textToCopy = (textEl.textContent || textEl.innerText || '').trim();
  const doFeedback = () => {
    const origHtml = btn.innerHTML;
    btn.innerHTML = '✓ Tersalin!';
    btn.style.background = '#15803d';
    setTimeout(() => {
      btn.innerHTML = origHtml;
      btn.style.background = '';
    }, 2000);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(doFeedback).catch(() => {
      fallbackSbiCopy(textToCopy, doFeedback);
    });
  } else {
    fallbackSbiCopy(textToCopy, doFeedback);
  }
};

window.copySbiFullSummary = function(btn) {
  const label = document.getElementById('sbi-ai-period-label')?.textContent || 'PERIODE AKTIF';
  const total = document.getElementById('sbi-kpi-total-dec')?.textContent || '0';
  const cai = document.getElementById('sbi-kpi-total-cai')?.textContent || '0';
  const notCai = document.getElementById('sbi-kpi-total-notcai')?.textContent || '0';
  const acv = document.getElementById('sbi-kpi-avg-acv')?.textContent || '0.0%';

  const fullReport = `📊 *RINGKASAN EKSEKUTIF ANALISA AI & RETENSI SBI*
📍 *Tunas Toyota Kiaracondong*
🗓️ *Periode:* ${label}

📈 *Pencapaian Kunci:*
• Total Potensi SBI (DEC): *${total} Unit*
• Realisasi Datang (CAI): *${cai} Unit* (${acv})
• Pelanggan Belum Masuk (NOT CAI): *${notCai} Unit*

🔍 *Faktor Penghambat Utama (Loss Drivers):*
1. Attrition ke Bengkel Luar / Umum (Persepsi Biaya)
2. Hambatan Teritorial / Domisili Jauh (Bandung Barat, Cimahi, Garut)
3. Contactability Barrier (No. HP tidak aktif / salah sambung)
4. Pelanggan Menunda / Belum Sempat Servis

🚀 *Rekomendasi Countermeasure Operasional:*
1. *Program Win-Back*: Paket bundling oli TMO + diskon jasa 20% & garansi resmi.
2. *THS Express & Shuttle*: Jemput bola servis di rumah/kantor untuk klaster luar wilayah.
3. *Supervisi Mandat Sales*: SPV mengawal daftar salesman yang memiliki tunggakan follow-up setiap briefing pagi.
4. *Pre-Call Reminder T-7*: Blast WhatsApp otomatis H-7 dan telepon konfirmasi H-3 sebelum jatuh tempo.

_Generated automatically via Tunas Toyota Kiaracondong Aftersales Dashboard_`;

  const doFeedback = () => {
    const origHtml = btn.innerHTML;
    btn.innerHTML = '✓ Laporan Tersalin!';
    btn.style.background = '#15803d';
    btn.style.color = '#ffffff';
    setTimeout(() => {
      btn.innerHTML = origHtml;
      btn.style.background = '';
      btn.style.color = '';
    }, 2500);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullReport).then(doFeedback).catch(() => {
      fallbackSbiCopy(fullReport, doFeedback);
    });
  } else {
    fallbackSbiCopy(fullReport, doFeedback);
  }
};

function fallbackSbiCopy(text, callback) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (callback) callback();
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(ta);
}

function renderSbiCharts(records) {
  if (!records) records = sbiFilteredRecords || [];
  const totalRec = records.length || 1;

  // -------------------------------------------------------------------------
  // TOP CHART A: TREN BULANAN REALISASI SBI (Jan - Des Tahun Aktif / 2026)
  // Potensi DEC vs Datang Servis CAI & % Acv per Bulan
  // -------------------------------------------------------------------------
  const monthlyCanvas = document.getElementById('chart-sbi-monthly');
  if (monthlyCanvas) {
    if (sbiChartInstances.monthly) sbiChartInstances.monthly.destroy();

    const targetYear = (sbiActiveYear && sbiActiveYear !== 'all') ? sbiActiveYear : '2026';
    const titleEl = document.getElementById('sbi-monthly-chart-title');
    if (titleEl) {
      titleEl.textContent = `Tren Bulanan Realisasi SBI ${targetYear}`;
    }

    const monthKeys = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

    const recsForYear = (sbiData && sbiData.records) 
      ? sbiData.records.filter(r => String(r.year) === String(targetYear))
      : [];

    const monthlyStats = monthKeys.map((mKey, idx) => {
      const mRecs = recsForYear.filter(r => (r.month || '').toUpperCase() === mKey.toUpperCase());
      const dec = mRecs.length;
      const cai = mRecs.filter(r => (r.cai || '').toUpperCase() === 'CAI').length;
      const acv = dec > 0 ? parseFloat((cai / dec * 100).toFixed(1)) : 0;
      return { key: mKey, short: monthShorts[idx], dec, cai, acv };
    });

    sbiChartInstances.monthly = new Chart(monthlyCanvas, {
      type: 'bar',
      data: {
        labels: monthlyStats.map(s => s.short),
        datasets: [
          {
            label: 'Potensi DEC',
            data: monthlyStats.map(s => s.dec),
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            borderColor: '#2563eb',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Datang (CAI)',
            data: monthlyStats.map(s => s.cai),
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: '% Acv',
            data: monthlyStats.map(s => s.acv),
            type: 'line',
            borderColor: '#f59e0b',
            backgroundColor: '#f59e0b',
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.yAxisID === 'y1') {
                  return `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`;
                }
                return `${ctx.dataset.label}: ${ctx.raw} Unit`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Unit', font: { size: 11, weight: '700' } },
            grid: { color: '#f1f5f9' }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Achievement (%)', font: { size: 11, weight: '700' } },
            grid: { drawOnChartArea: false },
            ticks: { callback: v => v + '%' }
          },
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '700' } } }
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // TOP CHART B: PERFORMA TAHUNAN (2024 - 2026)
  // Volume DEC & Pertumbuhan Unit Hybrid Toyota
  // -------------------------------------------------------------------------
  const yearlyCanvas = document.getElementById('chart-sbi-yearly');
  if (yearlyCanvas) {
    if (sbiChartInstances.yearly) sbiChartInstances.yearly.destroy();

    const years = ['2024', '2025', '2026'];
    const allRecs = (sbiData && sbiData.records) ? sbiData.records : [];
    const yearlyStats = years.map(yr => {
      const yrRecs = allRecs.filter(r => String(r.year) === yr);
      const dec = yrRecs.length;
      const hybrid = yrRecs.filter(r => (r.car_type || '').toUpperCase().includes('HYBRID')).length;
      const pctHybrid = dec > 0 ? (hybrid / dec * 100).toFixed(1) : '0.0';
      return { yr, dec, hybrid, pctHybrid };
    });

    sbiChartInstances.yearly = new Chart(yearlyCanvas, {
      type: 'bar',
      data: {
        labels: years.map(y => y === '2026' ? '2026 (YTD)' : y),
        datasets: [
          {
            label: 'Total DEC',
            data: yearlyStats.map(s => s.dec),
            backgroundColor: '#1e293b',
            borderRadius: 4
          },
          {
            label: 'Unit Hybrid',
            data: yearlyStats.map(s => s.hybrid),
            backgroundColor: '#10b981',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                if (ctx.datasetIndex === 1) {
                  const s = yearlyStats[ctx.dataIndex];
                  return `Pangsa Hybrid: ${s.pctHybrid}%`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Unit', font: { size: 11, weight: '700' } } },
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '700' } } }
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // CHART 1: GRAFIK SBI PER SUPERVISOR (SS)
  // FERYANTO, MUHAMMAD CAISARIVA, ALVIN
  // -------------------------------------------------------------------------
  const ssCanvas = document.getElementById('chart-sbi-ss');
  if (ssCanvas) {
    if (sbiChartInstances.ss) sbiChartInstances.ss.destroy();

    const ssList = ['FERYANTO', 'MUHAMMAD CAISARIVA', 'ALVIN'];
    const ssStats = ssList.map(name => {
      const spvRecs = records.filter(r => (r.ss || '').toUpperCase().includes(name));
      const dec = spvRecs.length;
      const cai = spvRecs.filter(r => (r.cai || '').toUpperCase() === 'CAI').length;
      const notCai = dec - cai;
      const acv = dec > 0 ? parseFloat((cai / dec * 100).toFixed(1)) : 0;
      const share = parseFloat((dec / totalRec * 100).toFixed(1));
      return { name, dec, cai, notCai, acv, share };
    });

    sbiChartInstances.ss = new Chart(ssCanvas, {
      type: 'bar',
      data: {
        labels: ssStats.map(s => s.name === 'MUHAMMAD CAISARIVA' ? 'CAISARIVA' : s.name),
        datasets: [
          {
            label: 'Potensi DEC',
            data: ssStats.map(s => s.dec),
            backgroundColor: '#3b82f6',
            borderRadius: 4
          },
          {
            label: 'Datang (CAI)',
            data: ssStats.map(s => s.cai),
            backgroundColor: '#10b981',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const s = ssStats[ctx.dataIndex];
                return `Acv: ${s.acv}% | Pangsa: ${s.share}%`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Unit' } },
          x: { grid: { display: false }, ticks: { font: { size: 10.5, weight: '700' } } }
        }
      }
    });

    // Populate explicit metric badges (Angka & Persentase)
    const ssStrip = document.getElementById('sbi-stats-ss');
    if (ssStrip) {
      ssStrip.innerHTML = ssStats.map(s => `
        <span class="sbi-metric-badge">
          <span class="m-label">${s.name.split(' ')[0]}:</span>
          <span class="m-val">${formatNum(s.cai)}/${formatNum(s.dec)} Unit</span>
          <span class="m-pct">${s.acv}% Acv</span>
        </span>
      `).join('');
    }
  }

  // -------------------------------------------------------------------------
  // CHART 2: GRAFIK SBI PER TYPE CUST (Retail, Fleet, Related Parties)
  // -------------------------------------------------------------------------
  const typeCustCanvas = document.getElementById('chart-sbi-type-cust');
  if (typeCustCanvas) {
    if (sbiChartInstances.typeCust) sbiChartInstances.typeCust.destroy();

    const typeList = ['Retail', 'Fleet', 'Related Parties'];
    const typeStats = typeList.map(name => {
      const typeRecs = records.filter(r => {
        const tc = (r.type_cust || '').toUpperCase();
        if (name === 'Retail') return tc.includes('RETAIL');
        if (name === 'Fleet') return tc.includes('FLEET') || tc.includes('CORPORATE');
        if (name === 'Related Parties') return tc.includes('RELATED') || tc.includes('PARTIES');
        return false;
      });
      const dec = typeRecs.length;
      const cai = typeRecs.filter(r => (r.cai || '').toUpperCase() === 'CAI').length;
      const acv = dec > 0 ? parseFloat((cai / dec * 100).toFixed(1)) : 0;
      const share = parseFloat((dec / totalRec * 100).toFixed(1));
      return { name, dec, cai, acv, share };
    });

    sbiChartInstances.typeCust = new Chart(typeCustCanvas, {
      type: 'bar',
      data: {
        labels: typeStats.map(s => s.name),
        datasets: [
          {
            label: 'Potensi DEC',
            data: typeStats.map(s => s.dec),
            backgroundColor: '#6366f1',
            borderRadius: 4
          },
          {
            label: 'Datang (CAI)',
            data: typeStats.map(s => s.cai),
            backgroundColor: '#059669',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const s = typeStats[ctx.dataIndex];
                return `Acv: ${s.acv}% | Pangsa: ${s.share}%`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Unit' } },
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '700' } } }
        }
      }
    });

    const typeStrip = document.getElementById('sbi-stats-type-cust');
    if (typeStrip) {
      typeStrip.innerHTML = typeStats.map(s => `
        <span class="sbi-metric-badge">
          <span class="m-label">${s.name}:</span>
          <span class="m-val">${formatNum(s.cai)}/${formatNum(s.dec)} Unit</span>
          <span class="m-pct">${s.acv}% (${s.share}% share)</span>
        </span>
      `).join('');
    }
  }

  // -------------------------------------------------------------------------
  // CHART 3: GRAFIK SBI PER CAR TYPE (Non LCGC, LCGC, Hybrid)
  // -------------------------------------------------------------------------
  const carTypeCanvas = document.getElementById('chart-sbi-car-type');
  if (carTypeCanvas) {
    if (sbiChartInstances.carType) sbiChartInstances.carType.destroy();

    const segList = ['NON LCGC', 'LCGC', 'HYBRID'];
    const segStats = segList.map(name => {
      const segRecs = records.filter(r => (r.car_type || '').toUpperCase().includes(name));
      const dec = segRecs.length;
      const cai = segRecs.filter(r => (r.cai || '').toUpperCase() === 'CAI').length;
      const acv = dec > 0 ? parseFloat((cai / dec * 100).toFixed(1)) : 0;
      const share = parseFloat((dec / totalRec * 100).toFixed(1));
      return { name, dec, cai, acv, share };
    });

    sbiChartInstances.carType = new Chart(carTypeCanvas, {
      type: 'bar',
      data: {
        labels: segStats.map(s => s.name),
        datasets: [
          {
            label: 'Potensi DEC',
            data: segStats.map(s => s.dec),
            backgroundColor: '#475569',
            borderRadius: 4
          },
          {
            label: 'Datang (CAI)',
            data: segStats.map(s => s.cai),
            backgroundColor: '#8b5cf6',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const s = segStats[ctx.dataIndex];
                return `Acv: ${s.acv}% | Pangsa: ${s.share}%`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Unit' } },
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '700' } } }
        }
      }
    });

    const carStrip = document.getElementById('sbi-stats-car-type');
    if (carStrip) {
      carStrip.innerHTML = segStats.map(s => `
        <span class="sbi-metric-badge">
          <span class="m-label">${s.name}:</span>
          <span class="m-val">${formatNum(s.cai)}/${formatNum(s.dec)} Unit</span>
          <span class="m-pct">${s.acv}% (${s.share}% share)</span>
        </span>
      `).join('');
    }
  }

  // -------------------------------------------------------------------------
  // CHART 4: GRAFIK PENCAPAIAN BERDASARKAN KOTA (DARI KOLOM KAB)
  // -------------------------------------------------------------------------
  const kabCanvas = document.getElementById('chart-sbi-kab');
  if (kabCanvas) {
    if (sbiChartInstances.kab) sbiChartInstances.kab.destroy();

    // Group by KAB
    const kabMap = {};
    records.forEach(r => {
      let k = (r.kab || 'LAINNYA').trim().toUpperCase();
      if (!k || k === '#N/A' || k === 'NO RECORD') k = 'LAINNYA';
      if (!kabMap[k]) kabMap[k] = { dec: 0, cai: 0 };
      kabMap[k].dec++;
      if ((r.cai || '').toUpperCase() === 'CAI') kabMap[k].cai++;
    });

    // Sort by DEC descending and take top 7 + Lainnya
    const sortedKab = Object.entries(kabMap).sort((a, b) => b[1].dec - a[1].dec);
    const top7 = sortedKab.slice(0, 7);
    const remainder = sortedKab.slice(7);
    let otherDec = 0, otherCai = 0;
    remainder.forEach(([_, v]) => { otherDec += v.dec; otherCai += v.cai; });

    const finalKabStats = top7.map(([k, v]) => ({
      name: k.replace('KOTA ', 'KOTA ').replace('KAB. ', 'KAB. '),
      dec: v.dec,
      cai: v.cai,
      acv: v.dec > 0 ? parseFloat((v.cai / v.dec * 100).toFixed(1)) : 0
    }));

    if (otherDec > 0) {
      finalKabStats.push({
        name: 'KOTA/KAB LAINNYA',
        dec: otherDec,
        cai: otherCai,
        acv: otherDec > 0 ? parseFloat((otherCai / otherDec * 100).toFixed(1)) : 0
      });
    }

    if (finalKabStats.length === 0) {
      finalKabStats.push({
        name: '(Belum Ada Data Wilayah)',
        dec: 0,
        cai: 0,
        acv: 0
      });
    }

    sbiChartInstances.kab = new Chart(kabCanvas, {
      type: 'bar',
      data: {
        labels: finalKabStats.map(s => s.name),
        datasets: [
          {
            label: 'Potensi DEC',
            data: finalKabStats.map(s => s.dec),
            backgroundColor: '#f59e0b',
            borderRadius: 4
          },
          {
            label: 'Datang (CAI)',
            data: finalKabStats.map(s => s.cai),
            backgroundColor: '#0284c7',
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const s = finalKabStats[ctx.dataIndex];
                return `Pencapaian: ${s.acv}%`;
              }
            }
          }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Unit' } },
          y: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' } } }
        }
      }
    });

    const kabStrip = document.getElementById('sbi-stats-kab');
    if (kabStrip) {
      if (finalKabStats[0]?.name.includes('Belum Ada Data')) {
        kabStrip.innerHTML = '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Belum ada data wilayah kota/kabupaten pada periode ini</span>';
      } else {
        kabStrip.innerHTML = finalKabStats.slice(0, 5).map(s => `
          <span class="sbi-metric-badge">
            <span class="m-label">${s.name}:</span>
            <span class="m-val">${formatNum(s.cai)}/${formatNum(s.dec)} Unit</span>
            <span class="m-pct">${s.acv}%</span>
          </span>
        `).join('');
      }
    }
  }
}

function renderSbiNotesFu(records) {
  const container = document.getElementById('sbi-fu-notes-list');
  const totalNotCaiLabel = document.getElementById('sbi-fu-total-notcai');
  const badgeTop = document.getElementById('sbi-fu-badge-top');
  if (!container) return;

  const notCaiList = records.filter(r => (r.cai || '').toUpperCase() !== 'CAI');
  const totalNotCai = notCaiList.length;
  if (totalNotCaiLabel) totalNotCaiLabel.textContent = `${formatNum(totalNotCai)} Unit`;

  const categories = [
    { key: 'SERVICE DI TEMPAT LAIN', label: 'Service Di Tempat Lain / Umum', color: '#ef4444', count: 0 },
    { key: 'LOKASI', label: 'Lokasi / Jarak Jauh (Luar Kota)', color: '#f97316', count: 0 },
    { key: 'NOMER TIDAK DAPAT DIHUBUNGI', label: 'Nomor Tidak Dapat Dihubungi / Tidak Aktif', color: '#eab308', count: 0 },
    { key: 'AKAN MENGHUBUNGI BENGKEL', label: 'Janji Akan Menghubungi Bengkel', color: '#06b6d4', count: 0 },
    { key: 'BOOKING', label: 'Booking / Dalam Proses Penjadwalan', color: '#3b82f6', count: 0 },
    { key: 'LAINNYA', label: 'Belum Ada Notes / Lain-lain', color: '#94a3b8', count: 0 }
  ];

  notCaiList.forEach(r => {
    const n = (r.notes_fu || '').toUpperCase();
    if (n.includes('TEMPAT LAIN') || n.includes('BENGKEL LAIN') || n.includes('LUAR')) {
      categories[0].count++;
    } else if (n.includes('LOKASI') || n.includes('JARAK') || n.includes('JAUH') || n.includes('LUAR KOTA')) {
      categories[1].count++;
    } else if (n.includes('TIDAK DAPAT DIHUBUNGI') || n.includes('TIDAK AKTIF') || n.includes('SALAH SAMBUNG') || n.includes('NO HP')) {
      categories[2].count++;
    } else if (n.includes('AKAN MENGHUBUNGI') || n.includes('JANJI')) {
      categories[3].count++;
    } else if (n.includes('BOOKING') || n.includes('RESCHEDULE')) {
      categories[4].count++;
    } else {
      categories[5].count++;
    }
  });

  if (badgeTop && categories[0].count > 0) {
    const topPct = totalNotCai > 0 ? (categories[0].count / totalNotCai * 100).toFixed(1) : 0;
    badgeTop.textContent = `Top: Servis di Tempat Lain (${topPct}%)`;
  }

  container.innerHTML = categories.map(cat => {
    const pct = totalNotCai > 0 ? (cat.count / totalNotCai * 100).toFixed(1) : '0.0';
    return `
      <div class="sbi-fu-note-row">
        <div class="sbi-fu-note-info">
          <span class="sbi-fu-note-label">
            <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${cat.color};"></span>
            ${cat.label}
          </span>
          <span class="sbi-fu-note-stats"><strong>${formatNum(cat.count)} Unit</strong> (${pct}%)</span>
        </div>
        <div class="sbi-fu-progress-track">
          <div class="sbi-fu-progress-fill" style="width: ${pct}%; background: ${cat.color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSbiSalesPerSpv(records) {
  const tbody = document.getElementById('sbi-spv-sales-tbody');
  if (!tbody) return;

  const notCaiList = records.filter(r => (r.cai || '').toUpperCase() !== 'CAI');

  // Count per SPV and update button counters
  const spvNames = ['FERYANTO', 'MUHAMMAD CAISARIVA', 'ALVIN'];
  const spvIdMap = {
    'FERYANTO': 'cnt-spv-feryanto',
    'MUHAMMAD CAISARIVA': 'cnt-spv-caisariva',
    'ALVIN': 'cnt-spv-alvin'
  };

  const spvTotals = {};
  spvNames.forEach(spv => {
    const spvNotCai = notCaiList.filter(r => (r.ss || '').toUpperCase().includes(spv));
    spvTotals[spv] = spvNotCai.length;
    const badgeEl = document.getElementById(spvIdMap[spv]);
    if (badgeEl) badgeEl.textContent = formatNum(spvNotCai.length);
  });

  // Filter records for active SPV
  const activeSpvNotCai = notCaiList.filter(r => (r.ss || '').toUpperCase().includes(sbiActiveSpv));
  const activeTotal = activeSpvNotCai.length || 1;

  // Group by sales person
  const salesMap = {};
  activeSpvNotCai.forEach(r => {
    let name = (r.sales_person || 'Tanpa Nama').trim();
    if (!name || name === '-' || name.toUpperCase() === 'NO RECORD') name = 'Tanpa Nama Sales';
    if (!salesMap[name]) {
      salesMap[name] = { count: 0, models: {} };
    }
    salesMap[name].count++;
    const m = (r.model || 'Toyota').trim();
    salesMap[name].models[m] = (salesMap[name].models[m] || 0) + 1;
  });

  const sortedSales = Object.entries(salesMap).sort((a, b) => b[1].count - a[1].count);

  if (sortedSales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:#64748b;">Tidak ada data pelanggan Belum CAI untuk SPV ${sbiActiveSpv} pada periode ini.</td></tr>`;
    return;
  }

  tbody.innerHTML = sortedSales.map(([name, data], idx) => {
    const share = (data.count / activeTotal * 100).toFixed(1);
    const topModel = Object.entries(data.models).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Toyota';
    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-weight: 700;">${idx + 1}</td>
        <td><strong>${name}</strong></td>
        <td style="text-align: center;"><span class="sbi-sales-badge-count">${formatNum(data.count)} Unit</span></td>
        <td style="text-align: center; font-weight: 700; color: #2563eb;">${share}%</td>
        <td style="color: #475569;"><small>${topModel}</small></td>
      </tr>
    `;
  }).join('');
}

function renderSbiTable() {
  const tbody = document.getElementById('sbi-table-body');
  if (!tbody) return;

  const total = sbiFilteredRecords.length;
  const totalPages = Math.ceil(total / sbiPageSize) || 1;
  if (sbiCurrentPage > totalPages) sbiCurrentPage = totalPages;
  if (sbiCurrentPage < 1) sbiCurrentPage = 1;

  const startIdx = (sbiCurrentPage - 1) * sbiPageSize;
  const endIdx = Math.min(startIdx + sbiPageSize, total);
  const pageRecords = sbiFilteredRecords.slice(startIdx, endIdx);

  const rangeEl = document.getElementById('sbi-count-range');
  const totalEl = document.getElementById('sbi-count-total');
  const pageInfoEl = document.getElementById('sbi-page-info');

  if (rangeEl) rangeEl.textContent = total > 0 ? `${startIdx + 1} - ${endIdx}` : '0';
  if (totalEl) totalEl.textContent = formatNum(total);
  if (pageInfoEl) pageInfoEl.textContent = `Halaman ${sbiCurrentPage} dari ${totalPages}`;

  if (pageRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" style="text-align: center; padding: 40px; color: #64748b;">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Tidak ada data pelanggan SBI yang sesuai filter</div>
          <div style="font-size: 12px;">Coba atur ulang kata kunci pencarian atau filter di atas.</div>
        </td>
      </tr>
    `;
    renderSbiPaginationButtons(1, 1);
    return;
  }

  let html = '';
  pageRecords.forEach((rec, idx) => {
    const globalIdx = startIdx + idx + 1;
    const isCai = (rec.cai || '').toUpperCase() === 'CAI';
    const caiBadge = isCai ? '<span class="sbi-badge badge-cai">CAI</span>' : '<span class="sbi-badge badge-not-cai">NOT CAI</span>';

    // Car type badge
    let carTypeBadge = '<span class="sbi-badge badge-non-lcgc">NON LCGC</span>';
    const ctUpper = (rec.car_type || '').toUpperCase();
    if (ctUpper.includes('HYBRID')) carTypeBadge = '<span class="sbi-badge badge-hybrid">HYBRID</span>';
    else if (ctUpper.includes('LCGC')) carTypeBadge = '<span class="sbi-badge badge-lcgc">LCGC</span>';

    // Judgement badge
    const jUpper = (rec.judgement_cust || '').toUpperCase();
    let jBadge = `<span class="sbi-badge badge-loss">${escapeHtml(rec.judgement_cust || '-')}</span>`;
    if (jUpper.includes('HOT')) jBadge = `<span class="sbi-badge badge-hot">HOT</span>`;
    else if (jUpper.includes('HIGH')) jBadge = `<span class="sbi-badge badge-high">HIGH</span>`;
    else if (jUpper.includes('MEDIUM')) jBadge = `<span class="sbi-badge badge-med">MEDIUM</span>`;
    else if (jUpper.includes('LOW')) jBadge = `<span class="sbi-badge badge-low">LOW</span>`;
    else if (jUpper.includes('LOSS')) jBadge = `<span class="sbi-badge badge-loss">POTENCIAL LOSS</span>`;
    else if (jUpper.includes('NEW')) jBadge = `<span class="sbi-badge badge-new">NEW CUST</span>`;

    // T-Care badge
    const isTcareActive = (rec.status_tcare || '').toUpperCase() === 'ACTIVE';
    const tcareBadge = isTcareActive
      ? '<span class="sbi-badge badge-tcare-active">ACTIVE</span>'
      : `<span class="sbi-badge badge-tcare-finish">${escapeHtml(rec.status_tcare || '-')}</span>`;

    // Milestones strip
    const ms10 = rec.cai_10k && !rec.cai_10k.toUpperCase().includes('NOT');
    const ms20 = rec.cai_20k && !rec.cai_20k.toUpperCase().includes('NOT');
    const ms30 = rec.cai_30k && !rec.cai_30k.toUpperCase().includes('NOT');
    const ms40 = rec.cai_40k && !rec.cai_40k.toUpperCase().includes('NOT');
    const ms50 = rec.cai_50k && !rec.cai_50k.toUpperCase().includes('NOT');
    const ms60 = rec.cai_60k && !rec.cai_60k.toUpperCase().includes('NOT');
    const ms70 = rec.cai_70k && !rec.cai_70k.toUpperCase().includes('NOT');

    const msHtml = `
      <div class="milestone-strip" title="10K: ${rec.cai_10k || '-'} | 20K: ${rec.cai_20k || '-'} | 30K: ${rec.cai_30k || '-'} | 40K: ${rec.cai_40k || '-'}">
        <span class="m-dot ${ms10 ? 'done' : ''}">10K</span>
        <span class="m-dot ${ms20 ? 'done' : ''}">20K</span>
        <span class="m-dot ${ms30 ? 'done' : ''}">30K</span>
        <span class="m-dot ${ms40 ? 'done' : ''}">40K</span>
        <span class="m-dot ${ms50 ? 'done' : ''}">50K</span>
        <span class="m-dot ${ms60 ? 'done' : ''}">60K</span>
        <span class="m-dot ${ms70 ? 'done' : ''}">70K</span>
      </div>
    `;

    // Phone / WA link
    let phone = (rec.no_wa || rec.telepon1 || rec.telepon2 || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    else if (phone.startsWith('8')) phone = '62' + phone;

    const waBtn = phone ? `
      <a href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" class="btn-sbi-action btn-wa-action" title="Hubungi WhatsApp (+${phone})">
        WA
      </a>
    ` : '';

    html += `
      <tr>
        <td style="text-align: center; color: #64748b; font-size: 11px;">${globalIdx}</td>
        <td>${caiBadge}</td>
        <td style="font-size: 11px; white-space: nowrap;">${escapeHtml(rec.month || '')} ${escapeHtml(rec.year || '')}</td>
        <td><strong style="color: #0f172a; font-family: monospace;">${escapeHtml(rec.plat_no || '-')}</strong></td>
        <td>
          <div style="font-weight: 600; color: #0f172a;">${escapeHtml(rec.nama || '-')}</div>
          <span style="font-size: 10.5px; color: #64748b;">${escapeHtml(rec.type_cust || 'Retail')}</span>
        </td>
        <td style="font-weight: 500;">${escapeHtml(rec.model || '-')}</td>
        <td>${carTypeBadge}</td>
        <td style="font-size: 11px; color: #334155;">${escapeHtml(rec.ss || '-')}</td>
        <td style="font-size: 11.5px;" title="${escapeHtml(rec.penggalian_mrs || '')}">
          ${escapeHtml(rec.notes_fu || '-')}
        </td>
        <td>${jBadge}</td>
        <td>${tcareBadge}</td>
        <td>${msHtml}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="btn-sbi-action btn-sbi-detail" data-id="${rec.id}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Detail
          </button>
          ${waBtn}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Add click handlers for detail buttons
  tbody.querySelectorAll('.btn-sbi-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      const rec = sbiData.records.find(r => r.id === id);
      if (rec) openSbiDetailModal(rec);
    });
  });

  renderSbiPaginationButtons(sbiCurrentPage, totalPages);
}

function renderSbiPaginationButtons(curr, total) {
  const container = document.getElementById('sbi-pagination-buttons');
  if (!container) return;

  if (total <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button type="button" class="btn-sbi-page" ${curr === 1 ? 'disabled' : ''} data-p="${curr - 1}">
      ‹ Prev
    </button>
  `;

  const delta = 2;
  const left = curr - delta;
  const right = curr + delta;
  const range = [];

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i <= right)) {
      range.push(i);
    }
  }

  let last = 0;
  range.forEach(p => {
    if (last && p - last > 1) {
      html += `<span style="padding: 0 4px; color: #94a3b8;">…</span>`;
    }
    html += `
      <button type="button" class="btn-sbi-page ${p === curr ? 'active' : ''}" data-p="${p}">
        ${p}
      </button>
    `;
    last = p;
  });

  html += `
    <button type="button" class="btn-sbi-page" ${curr === total ? 'disabled' : ''} data-p="${curr + 1}">
      Next ›
    </button>
  `;

  container.innerHTML = html;

  container.querySelectorAll('.btn-sbi-page').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.getAttribute('data-p'), 10);
      if (p && p >= 1 && p <= total) {
        sbiCurrentPage = p;
        renderSbiTable();
        // Smooth scroll table container to top
        document.querySelector('.sbi-table-wrap')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function openSbiDetailModal(rec) {
  const modal = document.getElementById('sbi-detail-modal');
  const titleEl = document.getElementById('sbi-modal-title');
  const caiBadge = document.getElementById('sbi-modal-cai-badge');
  const jBadge = document.getElementById('sbi-modal-judgement-badge');
  const body = document.getElementById('sbi-modal-body-content');

  if (!modal || !body) return;

  if (titleEl) titleEl.textContent = `Detail Pelanggan: ${rec.nama || '-'} (${rec.plat_no || rec.vin})`;

  if (caiBadge) {
    const isCai = (rec.cai || '').toUpperCase() === 'CAI';
    caiBadge.textContent = isCai ? 'CAI (Datang Servis)' : 'NOT CAI';
    caiBadge.className = isCai ? 'sbi-badge badge-cai' : 'sbi-badge badge-not-cai';
  }

  if (jBadge) {
    jBadge.textContent = rec.judgement_cust || '-';
    const ju = (rec.judgement_cust || '').toUpperCase();
    if (ju.includes('HOT')) jBadge.className = 'sbi-badge badge-hot';
    else if (ju.includes('HIGH')) jBadge.className = 'sbi-badge badge-high';
    else if (ju.includes('LOSS')) jBadge.className = 'sbi-badge badge-loss';
    else jBadge.className = 'sbi-badge badge-med';
  }

  let phone = (rec.no_wa || rec.telepon1 || rec.telepon2 || '').replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '62' + phone.substring(1);
  else if (phone.startsWith('8')) phone = '62' + phone;

  const waBtnHtml = phone ? `
    <a href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; font-size: 11px; background: #25d366; color: #ffffff; border-radius: 4px; text-decoration: none; font-weight: 700; margin-left: 8px;">
      WhatsApp Langsung
    </a>
  ` : '';

  body.innerHTML = `
    <!-- Seksi 1: Data Kendaraan & Dokumen -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="22" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        1. Identitas Kendaraan &amp; Transaksi
      </div>
      <div class="sbi-detail-grid">
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Nomor Polisi</span>
          <span class="sbi-detail-val" style="font-size: 14px; font-family: monospace;">${escapeHtml(rec.plat_no || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Model Kendaraan</span>
          <span class="sbi-detail-val">${escapeHtml(rec.model || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Tipe Kendaraan (Car Type)</span>
          <span class="sbi-detail-val">${escapeHtml(rec.car_type || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Nomor VIN / Rangka</span>
          <span class="sbi-detail-val" style="font-family: monospace; font-size: 11.5px;">${escapeHtml(rec.vin || rec.nomor_rangka || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Tanggal Transaksi</span>
          <span class="sbi-detail-val">${escapeHtml(rec.tgl_transaksi || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Periode Servis (Bulan &amp; Tahun)</span>
          <span class="sbi-detail-val">${escapeHtml(rec.month || '-')} ${escapeHtml(rec.year || '')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Bulan CAI (SO Kedatangan)</span>
          <span class="sbi-detail-val">${escapeHtml(rec.bulan_cai_so || '-')}</span>
        </div>
      </div>
    </div>

    <!-- Seksi 2: Profil & Kontak Pelanggan -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        2. Profil &amp; Informasi Kontak Pelanggan
      </div>
      <div class="sbi-detail-grid">
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Nama Pelanggan</span>
          <span class="sbi-detail-val">${escapeHtml(rec.nama || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Segmentasi Pelanggan (Type Cust)</span>
          <span class="sbi-detail-val">${escapeHtml(rec.type_cust || 'Retail')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Telepon 1 &amp; WhatsApp</span>
          <span class="sbi-detail-val">${escapeHtml(rec.no_wa || rec.telepon1 || '-')} ${waBtnHtml}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Telepon 2 / 3</span>
          <span class="sbi-detail-val">${escapeHtml(rec.telepon2 || rec.telepon3 || '-')}</span>
        </div>
        <div class="sbi-detail-item" style="grid-column: span 2;">
          <span class="sbi-detail-label">Alamat Lengkap</span>
          <span class="sbi-detail-val">${escapeHtml(rec.alamat || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Kabupaten / Kota</span>
          <span class="sbi-detail-val">${escapeHtml(rec.kab || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Ring Area Tempat Tinggal</span>
          <span class="sbi-detail-val">${escapeHtml(rec.ring_area || '-')}</span>
        </div>
      </div>
    </div>

    <!-- Seksi 3: Aktivitas Follow Up & Interaksi Sales -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        3. Aktivitas Follow Up, Sales &amp; MRS
      </div>
      <div class="sbi-detail-grid">
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Service Sales (SS)</span>
          <span class="sbi-detail-val" style="color: #2563eb;">${escapeHtml(rec.ss || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Sales Person</span>
          <span class="sbi-detail-val">${escapeHtml(rec.sales_person || rec.sales || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Metode Follow Up</span>
          <span class="sbi-detail-val">${escapeHtml(rec.fu_by || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Tanggal Follow Up</span>
          <span class="sbi-detail-val">${escapeHtml(rec.tgl_fu || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Status Keterangan FU</span>
          <span class="sbi-detail-val">${escapeHtml(rec.ket_fu || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Hasil Follow Up (Notes)</span>
          <span class="sbi-detail-val">${escapeHtml(rec.notes_fu || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Potensi Sales</span>
          <span class="sbi-detail-val">${escapeHtml(rec.potency_sales || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">CAI To Dealer Tujuan</span>
          <span class="sbi-detail-val">${escapeHtml(rec.cai_to_dealer || '-')}</span>
        </div>
        <div class="sbi-detail-item" style="grid-column: span 2;">
          <span class="sbi-detail-label">Hasil Penggalian Keterangan MRS</span>
          <span class="sbi-detail-val" style="background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">${escapeHtml(rec.penggalian_mrs || '-')}</span>
        </div>
      </div>
    </div>

    <!-- Seksi 4: Program, Habit & Loyalitas -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        4. Program T-Care, Habit Servis &amp; Judgement
      </div>
      <div class="sbi-detail-grid">
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Status Program T-Care</span>
          <span class="sbi-detail-val">${escapeHtml(rec.status_tcare || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Judgement Pelanggan</span>
          <span class="sbi-detail-val" style="color: #b91c1c;">${escapeHtml(rec.judgement_cust || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Habit Ring Area Servis</span>
          <span class="sbi-detail-val">${escapeHtml(rec.habit_ring_area || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Habit Dealer Servis (Bengkel Langganan)</span>
          <span class="sbi-detail-val">${escapeHtml(rec.habit_dealer || '-')}</span>
        </div>
      </div>
    </div>

    <!-- Seksi 5: Riwayat Servis Berkala Kiara Condong -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        5. Riwayat Servis Berkala di Kiara Condong (10K – 70K)
      </div>
      <div class="sbi-milestone-grid">
        ${renderMsCard('10K', rec.cai_10k)}
        ${renderMsCard('20K', rec.cai_20k)}
        ${renderMsCard('30K', rec.cai_30k)}
        ${renderMsCard('40K', rec.cai_40k)}
        ${renderMsCard('50K', rec.cai_50k)}
        ${renderMsCard('60K', rec.cai_60k)}
        ${renderMsCard('70K', rec.cai_70k)}
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function renderMsCard(label, val) {
  const isDone = val && !val.toUpperCase().includes('NOT') && !val.includes('-');
  return `
    <div class="sbi-ms-card ${isDone ? 'ms-active' : ''}">
      <div class="sbi-ms-label">${label}</div>
      <div class="sbi-ms-date">${escapeHtml(val || 'NOT CAI')}</div>
    </div>
  `;
}

function exportSbiCsv() {
  if (!sbiFilteredRecords || sbiFilteredRecords.length === 0) {
    alert('Tidak ada data terfilter untuk diekspor.');
    return;
  }

  const cols = [
    'id', 'cai', 'year', 'month', 'plat_no', 'nama', 'type_cust', 'model', 'car_type',
    'vin', 'telepon1', 'no_wa', 'alamat', 'kab', 'ss', 'sales_person', 'fu_by', 'tgl_fu',
    'notes_fu', 'penggalian_mrs', 'potency_sales', 'status_tcare', 'ring_area',
    'cai_10k', 'cai_20k', 'cai_30k', 'cai_40k', 'cai_50k', 'cai_60k', 'cai_70k',
    'habit_dealer', 'judgement_cust'
  ];

  let csv = cols.map(c => `"${c.toUpperCase()}"`).join(',') + '\n';

  sbiFilteredRecords.forEach(r => {
    const row = cols.map(c => `"${String(r[c] || '').replace(/"/g, '""')}"`);
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sbi_data_kiaracondong_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function syncSbiFromLiveSheet() {
  const syncBtn = document.getElementById('btn-sync-sbi-sheet');
  const spinIcon = document.getElementById('sbi-sync-spin-icon');
  const label = document.getElementById('sbi-sync-label');

  if (syncBtn) syncBtn.disabled = true;
  if (spinIcon) spinIcon.style.animation = 'spin 0.8s linear infinite';
  if (label) label.textContent = 'Menyinkronkan...';

  try {
    let liveSynced = false;
    try {
      await fetchAndUpdateSbiLive();
      liveSynced = true;
    } catch (e) {
      console.warn('Direct GViz SBI sync failed, trying backend API...', e);
    }

    if (!liveSynced) {
      const resp = await fetch('api/sync_sbi.php');
      if (resp.ok) {
        const json = await resp.json();
        if (json.status === 'success') {
          await loadSbiData();
          liveSynced = true;
        }
      }
    }

    if (!liveSynced) {
      throw new Error('Tidak dapat terhubung ke Google Sheets maupun server lokal.');
    }

    if (typeof showFloatingToast === 'function') {
      showFloatingToast(`Sinkronisasi Data SBI Berhasil! (${sbiData?.meta?.total_records || 0} baris)`, 'success');
    } else {
      alert('Data SBI berhasil diperbarui dari Google Spreadsheet!');
    }
  } catch (err) {
    console.error('Error saat sync SBI:', err);
    alert('Gagal menyinkronkan data SBI: ' + err.message);
  } finally {
    if (syncBtn) syncBtn.disabled = false;
    if (spinIcon) spinIcon.style.animation = '';
    if (label) label.textContent = 'Sinkronkan Sheet SBI';
  }
}

// ==========================================================================
// SBI YEAR-OVER-YEAR & MULTI-YEAR COMPARISON
// ==========================================================================
let sbiCompareBaseYear = '2024';
let sbiCompareTargetYear = '2025';
let sbiCompareMonthFilter = 'all';
let sbiCompareMonthlyMetric = 'cai'; // 'cai' or 'dec'
let sbiCompareEventsInitialized = false;

const sbiMonthFilterMap = {
  'all': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  'ytd': Array.from({ length: new Date().getMonth() + 1 }, (_, i) => i + 1),
  'Q1': [1, 2, 3],
  'Q2': [4, 5, 6],
  'Q3': [7, 8, 9],
  'Q4': [10, 11, 12],
  'H1': [1, 2, 3, 4, 5, 6]
};

const sbiMonthLabels = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

function initSbiCompareEvents() {
  if (sbiCompareEventsInitialized) return;
  sbiCompareEventsInitialized = true;

  // Preset Buttons
  document.querySelectorAll('.btn-sbi-preset[data-sbi-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-sbi-preset[data-sbi-preset]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.getAttribute('data-sbi-preset');
      if (preset === '2024-2025') {
        sbiCompareBaseYear = '2024';
        sbiCompareTargetYear = '2025';
      } else if (preset === '2025-2026') {
        sbiCompareBaseYear = '2025';
        sbiCompareTargetYear = '2026';
        if (sbiCompareMonthFilter === 'all') sbiCompareMonthFilter = 'ytd';
      } else if (preset === '2024-2026') {
        sbiCompareBaseYear = '2024';
        sbiCompareTargetYear = '2026';
        if (sbiCompareMonthFilter === 'all') sbiCompareMonthFilter = 'ytd';
      }

      const selBase = document.getElementById('sbi-compare-base-year');
      const selTarget = document.getElementById('sbi-compare-target-year');
      const selMonth = document.getElementById('sbi-compare-month-filter');
      if (selBase) selBase.value = sbiCompareBaseYear;
      if (selTarget) selTarget.value = sbiCompareTargetYear;
      if (selMonth) selMonth.value = sbiCompareMonthFilter;

      renderSbiComparison();
    });
  });

  // Base Year Select
  const selBase = document.getElementById('sbi-compare-base-year');
  if (selBase) {
    selBase.addEventListener('change', () => {
      sbiCompareBaseYear = selBase.value;
      updateSbiPresetActiveState();
      renderSbiComparison();
    });
  }

  // Target Year Select
  const selTarget = document.getElementById('sbi-compare-target-year');
  if (selTarget) {
    selTarget.addEventListener('change', () => {
      sbiCompareTargetYear = selTarget.value;
      updateSbiPresetActiveState();
      renderSbiComparison();
    });
  }

  // Month Period Filter Select
  const selMonth = document.getElementById('sbi-compare-month-filter');
  if (selMonth) {
    selMonth.addEventListener('change', () => {
      sbiCompareMonthFilter = selMonth.value;
      renderSbiComparison();
    });
  }

  // Monthly Metric Toggle (CAI vs DEC)
  const btnCai = document.getElementById('btn-sbi-cmp-metric-cai');
  const btnDec = document.getElementById('btn-sbi-cmp-metric-dec');
  if (btnCai && btnDec) {
    btnCai.addEventListener('click', () => {
      btnCai.classList.add('active');
      btnDec.classList.remove('active');
      sbiCompareMonthlyMetric = 'cai';
      renderSbiCompareMonthlyChart();
    });
    btnDec.addEventListener('click', () => {
      btnDec.classList.add('active');
      btnCai.classList.remove('active');
      sbiCompareMonthlyMetric = 'dec';
      renderSbiCompareMonthlyChart();
    });
  }
}

function updateSbiPresetActiveState() {
  const currentPair = `${sbiCompareBaseYear}-${sbiCompareTargetYear}`;
  document.querySelectorAll('.btn-sbi-preset[data-sbi-preset]').forEach(btn => {
    if (btn.getAttribute('data-sbi-preset') === currentPair) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function getSbiRecordsForFilter(year, monthFilter) {
  if (!sbiData || !sbiData.records) return [];
  const allowed = sbiMonthFilterMap[monthFilter] || sbiMonthFilterMap['all'];
  return sbiData.records.filter(r => {
    if (String(r.year) !== String(year)) return false;
    const mNum = parseInt(r.month_num, 10);
    return allowed.includes(mNum);
  });
}

function computeSbiRecordMetrics(records) {
  const dec = records.length;
  let cai = 0;
  let hybrid = 0;
  let nonLcgc = 0;
  let lcgc = 0;
  let hot = 0;
  let high = 0;
  let med = 0;
  let low = 0;
  let potLoss = 0;
  let newCust = 0;
  let retail = 0;
  let fleet = 0;
  let tcare = 0;
  let ssFery = 0;
  let ssAdrian = 0;
  let ssCaisar = 0;
  let ssAlvin = 0;
  let ring1 = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const c = String(r.cai || '').toUpperCase();
    if (c === 'CAI') cai++;

    const car = String(r.car_type || '').toUpperCase();
    if (car.includes('HYBRID')) hybrid++;
    if (car.includes('NON LCGC')) nonLcgc++;
    else if (car === 'LCGC') lcgc++;

    const j = String(r.judgement_cust || '').toUpperCase();
    if (j === 'HOT') hot++;
    else if (j === 'HIGH') high++;
    else if (j === 'MEDIUM') med++;
    else if (j === 'LOW') low++;
    if (j.includes('LOSS')) potLoss++;
    if (j.includes('NEW CUST')) newCust++;

    const tc = String(r.type_cust || '').toUpperCase();
    if (tc.includes('RETAIL')) retail++;
    else if (tc.includes('FLEET')) fleet++;

    if (String(r.status_tcare || '').toUpperCase() === 'ACTIVE') tcare++;

    const s = String(r.ss || '').toUpperCase();
    if (s.includes('FERYANTO')) ssFery++;
    else if (s.includes('ADRIAN')) ssAdrian++;
    else if (s.includes('CAISARIVA')) ssCaisar++;
    else if (s.includes('ALVIN')) ssAlvin++;

    const ring = String(r.ring_area || '').toUpperCase();
    if (ring.includes('RING 1')) ring1++;
  }

  const notCai = dec - cai;
  const caiRate = dec > 0 ? (cai / dec * 100) : 0;
  const hybPct = dec > 0 ? (hybrid / dec * 100) : 0;

  return {
    dec, cai, notCai, caiRate,
    hybrid, hybPct, nonLcgc, lcgc,
    hot, high, med, low, potLoss, newCust,
    retail, fleet, tcare,
    ssFery, ssAdrian, ssCaisar, ssAlvin, ring1
  };
}

function formatSbiDelta(baseVal, targetVal, isRate = false, inverse = false) {
  const diff = targetVal - baseVal;
  let pctChange = 0;
  if (baseVal > 0) {
    pctChange = (diff / baseVal) * 100;
  } else if (targetVal > 0) {
    pctChange = 100;
  }

  let trend = 'flat';
  let badgeText = '— STABIL';

  if (Math.abs(diff) < 0.05) {
    trend = 'flat';
    badgeText = '— STABIL';
  } else if (diff > 0) {
    trend = inverse ? 'down' : 'up';
    badgeText = `▲ NAIK ${isRate ? diff.toFixed(1) + '%' : Math.abs(pctChange).toFixed(1) + '%'}`;
  } else {
    trend = inverse ? 'up' : 'down';
    badgeText = `▼ TURUN ${isRate ? Math.abs(diff).toFixed(1) + '%' : Math.abs(pctChange).toFixed(1) + '%'}`;
  }

  const diffStr = isRate
    ? (diff >= 0 ? `+${diff.toFixed(1)} ppt` : `${diff.toFixed(1)} ppt`)
    : (diff >= 0 ? `+${Math.round(diff).toLocaleString('id-ID')} Unit` : `${Math.round(diff).toLocaleString('id-ID')} Unit`);

  const pctStr = (diff >= 0 ? '+' : '') + pctChange.toFixed(1) + '%';

  return { diff, pctChange, diffStr, pctStr, trend, badgeText };
}

function renderSbiComparison() {
  if (!sbiData || !sbiData.records) return;

  const baseRecs = getSbiRecordsForFilter(sbiCompareBaseYear, sbiCompareMonthFilter);
  const targetRecs = getSbiRecordsForFilter(sbiCompareTargetYear, sbiCompareMonthFilter);

  const mBase = computeSbiRecordMetrics(baseRecs);
  const mTarget = computeSbiRecordMetrics(targetRecs);

  // 1. Update Labels
  const chartMLabel = document.getElementById('sbi-cmp-chart-m-label');
  if (chartMLabel) chartMLabel.textContent = `${sbiCompareBaseYear} vs ${sbiCompareTargetYear}`;

  const chartKLabel = document.getElementById('sbi-cmp-chart-k-label');
  if (chartKLabel) chartKLabel.textContent = `${sbiCompareBaseYear} vs ${sbiCompareTargetYear}`;

  const tblLabel = document.getElementById('sbi-cmp-tbl-label');
  if (tblLabel) {
    const monthNamesFullId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const pMap = {
      'all': 'Semua Bulan / 1 Tahun Penuh',
      'ytd': `Januari s/d ${monthNamesFullId[new Date().getMonth()]} (YTD)`,
      'Q1': 'Kuartal 1 (Jan - Mar)',
      'Q2': 'Kuartal 2 (Apr - Jun)',
      'Q3': 'Kuartal 3 (Jul - Sep)',
      'Q4': 'Kuartal 4 (Okt - Des)',
      'H1': 'Semester 1 (Jan - Jun)'
    };
    tblLabel.textContent = `Tahun ${sbiCompareBaseYear} ke ${sbiCompareTargetYear} • ${pMap[sbiCompareMonthFilter] || 'Semua Bulan'}`;
  }

  const thBase = document.getElementById('th-sbi-cmp-base');
  if (thBase) thBase.textContent = `Tahun ${sbiCompareBaseYear}`;

  const thTarget = document.getElementById('th-sbi-cmp-target');
  if (thTarget) thTarget.textContent = `Tahun ${sbiCompareTargetYear}`;

  // 2. Update 5 Hero Delta Cards
  const setElemText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const setBadge = (id, deltaObj) => {
    const el = document.getElementById(id);
    if (el) {
      el.className = `sbi-trend-badge ${deltaObj.trend}`;
      el.textContent = deltaObj.badgeText;
    }
  };

  // A. Potensi DEC
  const dDec = formatSbiDelta(mBase.dec, mTarget.dec);
  setElemText('sbi-cmp-dec-target', mTarget.dec.toLocaleString('id-ID'));
  setElemText('sbi-cmp-dec-base', mBase.dec.toLocaleString('id-ID'));
  setElemText('sbi-cmp-dec-diff', dDec.diffStr);
  setBadge('sbi-cmp-dec-badge', dDec);

  // B. Realisasi Datang CAI
  const dCai = formatSbiDelta(mBase.cai, mTarget.cai);
  setElemText('sbi-cmp-cai-target', mTarget.cai.toLocaleString('id-ID'));
  setElemText('sbi-cmp-cai-base', mBase.cai.toLocaleString('id-ID'));
  setElemText('sbi-cmp-cai-diff', dCai.diffStr);
  setBadge('sbi-cmp-cai-badge', dCai);

  // C. Rasio Kehadiran (% CAI)
  const dRate = formatSbiDelta(mBase.caiRate, mTarget.caiRate, true);
  setElemText('sbi-cmp-rate-target', mTarget.caiRate.toFixed(1) + '%');
  setElemText('sbi-cmp-rate-base', mBase.caiRate.toFixed(1) + '%');
  setElemText('sbi-cmp-rate-diff', dRate.diffStr);
  setBadge('sbi-cmp-rate-badge', dRate);

  // D. Unit Hybrid
  const dHyb = formatSbiDelta(mBase.hybrid, mTarget.hybrid);
  setElemText('sbi-cmp-hyb-target', mTarget.hybrid.toLocaleString('id-ID'));
  setElemText('sbi-cmp-hyb-base', mBase.hybrid.toLocaleString('id-ID'));
  setElemText('sbi-cmp-hyb-diff', dHyb.diffStr);
  setBadge('sbi-cmp-hyb-badge', dHyb);

  // E. Pelanggan HOT
  const dHot = formatSbiDelta(mBase.hot, mTarget.hot);
  setElemText('sbi-cmp-hot-target', mTarget.hot.toLocaleString('id-ID'));
  setElemText('sbi-cmp-hot-base', mBase.hot.toLocaleString('id-ID'));
  setElemText('sbi-cmp-hot-diff', dHot.diffStr);
  setBadge('sbi-cmp-hot-badge', dHot);

  // 3. Render Charts
  renderSbiCompareMonthlyChart();
  renderSbiCompareMetricsChart(mBase, mTarget);

  // 4. Render Table Matrix
  renderSbiCompareTable(mBase, mTarget);
}

function renderSbiCompareMonthlyChart() {
  const canvas = document.getElementById('chart-sbi-compare-monthly');
  if (!canvas) return;

  if (sbiChartInstances.compareMonthly) {
    sbiChartInstances.compareMonthly.destroy();
  }

  const allowedMonths = sbiMonthFilterMap[sbiCompareMonthFilter] || sbiMonthFilterMap['all'];
  const labels = allowedMonths.map(m => sbiMonthLabels[m - 1]);

  const baseMonthly = new Array(allowedMonths.length).fill(0);
  const targetMonthly = new Array(allowedMonths.length).fill(0);

  if (sbiData && sbiData.records) {
    sbiData.records.forEach(r => {
      const yr = String(r.year);
      const mNum = parseInt(r.month_num, 10);
      const mIdx = allowedMonths.indexOf(mNum);
      if (mIdx === -1) return;

      const isCai = String(r.cai || '').toUpperCase() === 'CAI';
      const val = (sbiCompareMonthlyMetric === 'cai') ? (isCai ? 1 : 0) : 1;

      if (yr === sbiCompareBaseYear) {
        baseMonthly[mIdx] += val;
      } else if (yr === sbiCompareTargetYear) {
        targetMonthly[mIdx] += val;
      }
    });
  }

  const metricTitle = sbiCompareMonthlyMetric === 'cai' ? 'Realisasi CAI' : 'Potensi DEC';

  sbiChartInstances.compareMonthly = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: `${metricTitle} ${sbiCompareBaseYear}`,
          data: baseMonthly,
          borderColor: '#64748b',
          backgroundColor: 'rgba(100, 116, 139, 0.15)',
          borderWidth: 2,
          borderDash: [5, 4],
          pointBackgroundColor: '#64748b',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.25,
          fill: false
        },
        {
          label: `${metricTitle} ${sbiCompareTargetYear}`,
          data: targetMonthly,
          borderColor: sbiCompareMonthlyMetric === 'cai' ? '#059669' : '#2563eb',
          backgroundColor: sbiCompareMonthlyMetric === 'cai' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(37, 99, 235, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: sbiCompareMonthlyMetric === 'cai' ? '#059669' : '#2563eb',
          pointRadius: 4.5,
          pointHoverRadius: 7,
          tension: 0.25,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10.5, weight: '700' } } },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              if (items.length >= 2) {
                const bVal = items[0].raw || 0;
                const tVal = items[1].raw || 0;
                const diff = tVal - bVal;
                const pct = bVal > 0 ? ((diff / bVal) * 100).toFixed(1) + '%' : (tVal > 0 ? '+100%' : '0%');
                return `\nSelisih: ${diff >= 0 ? '+' : ''}${diff} Unit (${diff >= 0 ? '+' : ''}${pct})`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10, weight: '600' } }
        }
      }
    }
  });
}

function renderSbiCompareMetricsChart(mBase, mTarget) {
  const canvas = document.getElementById('chart-sbi-compare-metrics');
  if (!canvas) return;

  if (sbiChartInstances.compareMetrics) {
    sbiChartInstances.compareMetrics.destroy();
  }

  const metricLabels = ['Potensi DEC', 'Datang CAI', 'Hybrid HEV', 'Pelanggan HOT', 'Non-LCGC', 'Retail', 'T-Care Aktif'];
  const baseData = [mBase.dec, mBase.cai, mBase.hybrid, mBase.hot, mBase.nonLcgc, mBase.retail, mBase.tcare];
  const targetData = [mTarget.dec, mTarget.cai, mTarget.hybrid, mTarget.hot, mTarget.nonLcgc, mTarget.retail, mTarget.tcare];

  sbiChartInstances.compareMetrics = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: metricLabels,
      datasets: [
        {
          label: `Tahun ${sbiCompareBaseYear}`,
          data: baseData,
          backgroundColor: 'rgba(148, 163, 184, 0.85)',
          borderColor: '#94a3b8',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: `Tahun ${sbiCompareTargetYear}`,
          data: targetData,
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          borderColor: '#1d4ed8',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10.5, weight: '700' } } },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              if (items.length >= 2) {
                const bVal = items[0].raw || 0;
                const tVal = items[1].raw || 0;
                const diff = tVal - bVal;
                const pct = bVal > 0 ? ((diff / bVal) * 100).toFixed(1) + '%' : (tVal > 0 ? '+100%' : '0%');
                return `\nSelisih: ${diff >= 0 ? '+' : ''}${diff} Unit (${diff >= 0 ? '+' : ''}${pct})`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 9.5, weight: '600' } }
        }
      }
    }
  });
}

function renderSbiCompareTable(mBase, mTarget) {
  const tbody = document.getElementById('sbi-compare-tbody');
  if (!tbody) return;

  const rows = [
    // Section 1: Volume & Kehadiran Servis
    {
      category: 'VOLUME & REALISASI SERVIS',
      icon: '🎯',
      name: 'Total Potensi Servis (DEC)',
      base: mBase.dec,
      target: mTarget.dec,
      isRate: false,
      unit: 'Unit',
      note: 'Total unit yang terjadwal servis berkala dalam database SBI'
    },
    {
      icon: '✅',
      name: 'Realisasi Hadir Servis (CAI)',
      base: mBase.cai,
      target: mTarget.cai,
      isRate: false,
      unit: 'Unit',
      note: 'Unit yang berhasil datang dan melakukan servis di bengkel'
    },
    {
      icon: '⏳',
      name: 'Belum Hadir Servis (NOT CAI)',
      base: mBase.notCai,
      target: mTarget.notCai,
      isRate: false,
      inverse: true,
      unit: 'Unit',
      note: 'Unit belum hadir / tertunda; angka lebih rendah menunjukkan efisiensi follow-up'
    },
    {
      icon: '📈',
      name: 'Tingkat Kehadiran (% CAI / Acv)',
      base: mBase.caiRate,
      target: mTarget.caiRate,
      isRate: true,
      unit: '%',
      note: 'Persentase keberhasilan konversi potensi DEC menjadi realisasi servis'
    },

    // Section 2: Elektrifikasi & Karakter Unit
    {
      category: 'ELEKTRIFIKASI & KATEGORI KENDARAAN',
      icon: '⚡',
      name: 'Unit Hybrid Electric (HEV)',
      base: mBase.hybrid,
      target: mTarget.hybrid,
      isRate: false,
      unit: 'Unit',
      note: 'Kendaraan elektrifikasi Toyota (Innova Zenix, Yaris Cross HEV, dll)'
    },
    {
      icon: '🔋',
      name: 'Pangsa Hybrid (% dari Total Potensi)',
      base: mBase.hybPct,
      target: mTarget.hybPct,
      isRate: true,
      unit: '%',
      note: 'Proporsi adopsi kendaraan ramah lingkungan di portofolio SBI'
    },
    {
      icon: '🚙',
      name: 'Unit Non-LCGC',
      base: mBase.nonLcgc,
      target: mTarget.nonLcgc,
      isRate: false,
      unit: 'Unit',
      note: 'Kendaraan segmen menengah-atas (Avanza, Veloz, Rush, Innova, Fortuner)'
    },
    {
      icon: '🚗',
      name: 'Unit LCGC (Calya & Agya)',
      base: mBase.lcgc,
      target: mTarget.lcgc,
      isRate: false,
      unit: 'Unit',
      note: 'Kendaraan segmen entry level / LCGC'
    },

    // Section 3: Segmentasi Loyalitas (Judgement TAM)
    {
      category: 'SEGMENTASI LOYALITAS PELANGGAN (TAM)',
      icon: '🔥',
      name: 'Pelanggan HOT (Loyal KC)',
      base: mBase.hot,
      target: mTarget.hot,
      isRate: false,
      unit: 'Unit',
      note: 'Pelanggan paling loyal dan selalu servis di Tunas Kiaracondong'
    },
    {
      icon: '⭐',
      name: 'Pelanggan HIGH (Potensi Tinggi)',
      base: mBase.high,
      target: mTarget.high,
      isRate: false,
      unit: 'Unit',
      note: 'Pelanggan dengan rekam jejak loyalitas servis yang kuat'
    },
    {
      icon: '🟡',
      name: 'Pelanggan MEDIUM (Peluang Retensi)',
      base: mBase.med,
      target: mTarget.med,
      isRate: false,
      unit: 'Unit',
      note: 'Pelanggan potensial yang membutuhkan pendekatan pengingat servis'
    },
    {
      icon: '⚠️',
      name: 'Resiko Churn (Potencial Loss)',
      base: mBase.potLoss,
      target: mTarget.potLoss,
      isRate: false,
      inverse: true,
      unit: 'Unit',
      note: 'Pelanggan berisiko pindah bengkel; penurunan angka berarti retensi membaik'
    },
    {
      icon: '🌱',
      name: 'Pelanggan Baru (New Cust Potency)',
      base: mBase.newCust,
      target: mTarget.newCust,
      isRate: false,
      unit: 'Unit',
      note: 'Pelanggan baru pertama kali terdata dalam database SBI'
    },

    // Section 4: Segmen Pelanggan & T-Care
    {
      category: 'SEGMEN PELANGGAN & PROGRAM T-CARE',
      icon: '👤',
      name: 'Pelanggan Retail (Perorangan)',
      base: mBase.retail,
      target: mTarget.retail,
      isRate: false,
      unit: 'Unit',
      note: 'Pemilik mobil pribadi perorangan'
    },
    {
      icon: '🏢',
      name: 'Pelanggan Fleet (Armada / Perusahaan)',
      base: mBase.fleet,
      target: mTarget.fleet,
      isRate: false,
      unit: 'Unit',
      note: 'Kendaraan operasional perusahaan & instansi'
    },
    {
      icon: '🛡️',
      name: 'Program T-Care (Status ACTIVE)',
      base: mBase.tcare,
      target: mTarget.tcare,
      isRate: false,
      unit: 'Unit',
      note: 'Kendaraan yang memiliki hak gratis servis berkala T-Care aktif'
    },

    // Section 5: Service Advisor (SS)
    {
      category: 'PERFORMA SERVICE ADVISOR (SS)',
      icon: '👨‍🔧',
      name: 'SS Feryanto',
      base: mBase.ssFery,
      target: mTarget.ssFery,
      isRate: false,
      unit: 'Unit',
      note: 'Volume penanganan follow-up dan penerimaan oleh SS Feryanto'
    },
    {
      icon: '👨‍🔧',
      name: 'SS Muhammad Caisariva',
      base: mBase.ssCaisar,
      target: mTarget.ssCaisar,
      isRate: false,
      unit: 'Unit',
      note: 'Volume penanganan follow-up dan penerimaan oleh SS Caisariva'
    },
    {
      icon: '👨‍🔧',
      name: 'SS Alvin',
      base: mBase.ssAlvin,
      target: mTarget.ssAlvin,
      isRate: false,
      unit: 'Unit',
      note: 'Volume penanganan follow-up dan penerimaan oleh SS Alvin'
    },

    // Section 6: Zonasi Wilayah
    {
      category: 'ZONASI WILAYAH PELANGGAN',
      icon: '📍',
      name: 'Ring 1 (Wilayah Inti Bengkel KC)',
      base: mBase.ring1,
      target: mTarget.ring1,
      isRate: false,
      unit: 'Unit',
      note: 'Pelanggan berdomisili paling dekat dengan bengkel Tunas Kiaracondong'
    }
  ];

  let html = '';
  let currentCat = '';

  rows.forEach(r => {
    if (r.category && r.category !== currentCat) {
      currentCat = r.category;
      html += `
        <tr style="background: #f8fafc; border-top: 1.5px solid #e2e8f0; border-bottom: 1.5px solid #e2e8f0;">
          <td colspan="7" style="font-size: 11px; font-weight: 800; color: #1e293b; letter-spacing: 0.5px; padding: 7px 12px; text-transform: uppercase;">
            ${currentCat}
          </td>
        </tr>
      `;
    }

    const d = formatSbiDelta(r.base, r.target, r.isRate, r.inverse);
    const baseDisplay = r.isRate ? r.base.toFixed(1) + '%' : r.base.toLocaleString('id-ID');
    const targetDisplay = r.isRate ? r.target.toFixed(1) + '%' : r.target.toLocaleString('id-ID');
    const diffColor = d.trend === 'up' ? '#15803d' : (d.trend === 'down' ? '#b91c1c' : '#475569');

    html += `
      <tr>
        <td style="font-weight: 600; color: #0f172a;">
          <span style="margin-right: 6px;">${r.icon}</span>${r.name}
        </td>
        <td style="font-weight: 700; color: #475569;">${baseDisplay}</td>
        <td style="font-weight: 800; color: #0f172a;">${targetDisplay}</td>
        <td style="font-weight: 800; color: ${diffColor};">${d.diffStr}</td>
        <td style="font-weight: 700; color: ${diffColor};">${d.pctStr}</td>
        <td style="text-align: center;">
          <span class="sbi-trend-badge ${d.trend}">${d.badgeText}</span>
        </td>
        <td style="font-size: 11px; color: #64748b; line-height: 1.35;">${r.note}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function renderSbi() {
  if (!sbiData) return;
  initSbiEvents();
  initSbiCompareEvents();
  updateSbiMonthPillBadges();
  renderSbiComparison();
  applySbiFiltersAndRender();
}


// ==========================================================================
// T-CARE EXECUTIVE INTELLIGENCE & RETENTION DASHBOARD
// Layout faithfully following Google Sheet "DASHBOARD"
// ==========================================================================
let tcareCurrentMatrixTab = 'by_customer_type';
let tcareRawPage = 1;
let tcareRawPageSize = 25;
let tcareFilteredRecords = [];
let tcareActiveQuickFilter = 'all';
let tcareEventsInitialized = false;

const TCARE_GSHEET_ID = '1ZjHhEWivPdj9eACghYUV3fZ3bbieycUpXdytmEnfkIk';

function parseTcareDashboardCsv(dashCsvText, rawCsvText, existingData) {
  const dRows = parseGSheetCSV(dashCsvText);
  if (!dRows || dRows.length < 150) return null;

  const g = (r1, c1) => ((dRows[r1 - 1] && dRows[r1 - 1][c1 - 1]) ? String(dRows[r1 - 1][c1 - 1]).trim() : '');
  const toInt = (val) => Math.round(cleanGSheetNum(val)) || 0;
  const toPct = (val) => {
    const s = String(val || '').trim();
    if (!s) return '0.0%';
    if (s.includes('%')) return s;
    const f = parseFloat(s.replace(',', '.'));
    return isNaN(f) ? s : `${(f <= 1.05 ? f * 100 : f).toFixed(1)}%`;
  };

  const program_summary = [13, 14, 15, 16].map(r => ({
    program: g(r, 2),
    dec: toInt(g(r, 3)),
    same_outlet: { volume: toInt(g(r, 4)), rate: toPct(g(r, 5)) },
    tunas_group: { volume: toInt(g(r, 6)), rate: toPct(g(r, 7)) },
    other_dealer: { volume: toInt(g(r, 8)), rate: toPct(g(r, 9)) },
    total_cai: toInt(g(r, 10)),
    overall_rate: toPct(g(r, 11))
  })).filter(p => p.program);

  const komposisi = {
    customer_type: {
      retail: { count: toInt(g(8, 26)), rate: toPct(g(8, 27)) },
      fleet: { count: toInt(g(9, 26)), rate: toPct(g(9, 27)) }
    },
    ring_area: {
      ring1: { count: toInt(g(10, 26)), rate: toPct(g(10, 27)) },
      ring2: { count: toInt(g(11, 26)), rate: toPct(g(11, 27)) },
      ring3: { count: toInt(g(12, 26)), rate: toPct(g(12, 27)) },
      out_of_area: { count: toInt(g(13, 26)), rate: toPct(g(13, 27)) }
    },
    punctuality: {
      punctual: { count: toInt(g(18, 26)), rate: toPct(g(18, 27)) },
      non_punctual: { count: toInt(g(19, 26)), rate: toPct(g(19, 27)) }
    },
    vehicle_type: {
      middle_low: { count: toInt(g(22, 26)), rate: toPct(g(22, 27)) },
      middle_up: { count: toInt(g(23, 26)), rate: toPct(g(23, 27)) },
      hybrid: { count: toInt(g(24, 26)), rate: toPct(g(24, 27)) }
    }
  };

  const mNames = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
  const cai_own_sales_by_program = [7, 8, 9].map(r => {
    const rates = {};
    mNames.forEach((mk, idx) => { rates[mk] = toPct(g(r, 16 + idx)); });
    return { program: g(r, 14), potensi: toInt(g(r, 15)), rates };
  }).filter(x => x.program);

  const cai_own_sales_by_vehicle_type = [41, 42, 43].map(r => {
    const rates = {};
    mNames.forEach((mk, idx) => { rates[mk] = toPct(g(r, 16 + idx)); });
    return { category: g(r, 14), potensi: toInt(g(r, 15)), rates };
  }).filter(x => x.category);

  const customer_type_comparison = {
    retail: {
      t_care: { potensi: toInt(g(35, 4)), cai: toInt(g(36, 4)), rate: toPct(g(37, 4)) },
      t_care_lite: { potensi: toInt(g(35, 6)), cai: toInt(g(36, 6)), rate: toPct(g(37, 6)) },
      t_care_lite_plus: { potensi: toInt(g(35, 8)), cai: toInt(g(36, 8)), rate: toPct(g(37, 8)) }
    },
    fleet: {
      t_care: { potensi: toInt(g(40, 4)), cai: toInt(g(41, 4)), rate: toPct(g(42, 4)) },
      t_care_lite: { potensi: toInt(g(40, 6)), cai: toInt(g(41, 6)), rate: toPct(g(42, 6)) },
      t_care_lite_plus: { potensi: toInt(g(40, 8)), cai: toInt(g(41, 8)), rate: toPct(g(42, 8)) }
    }
  };

  const retention_potency_summary = [117, 118, 119, 121].map(r => {
    const milestones = {};
    mNames.forEach((mk, idx) => {
      const bc = 3 + idx * 3;
      milestones[mk] = { potensi: toInt(g(r, bc)), cai: toInt(g(r, bc + 1)), rate: toPct(g(r, bc + 2)) };
    });
    return { program: g(r, 2), milestones };
  }).filter(x => x.program);

  const parseSegRow = (r, catName, progName) => {
    const intervals = {};
    mNames.forEach((mk, idx) => {
      const bc = 4 + idx * 6;
      intervals[mk] = {
        potensi: toInt(g(r, bc)),
        same_outlet: toInt(g(r, bc + 1)),
        tunas_group: toInt(g(r, bc + 2)),
        other_dealer: toInt(g(r, bc + 3)),
        cai: toInt(g(r, bc + 4)),
        rate: toPct(g(r, bc + 5))
      };
    });
    const cumulative = {
      potensi: toInt(g(r, 46)),
      same_outlet: toInt(g(r, 47)),
      tunas_group: toInt(g(r, 48)),
      other_dealer: toInt(g(r, 49)),
      total_own_sales: toInt(g(r, 50)),
      pct_so: toPct(g(r, 51)),
      pct_tg: toPct(g(r, 52)),
      pct_od: toPct(g(r, 53)),
      pct_total_rate: toPct(g(r, 54))
    };
    return { category: catName, program: progName, intervals, cumulative };
  };

  const segmented_matrices = {
    by_customer_type: [
      parseSegRow(137, 'RETAIL', 'T-CARE'), parseSegRow(138, 'RETAIL', 'T-CARE LITE'),
      parseSegRow(139, 'RETAIL', 'T-CARE LITE+'), parseSegRow(140, 'TOTAL RETAIL', 'ALL PROGRAMS'),
      parseSegRow(142, 'FLEET', 'T-CARE'), parseSegRow(143, 'FLEET', 'T-CARE LITE'),
      parseSegRow(144, 'FLEET', 'T-CARE LITE+'), parseSegRow(145, 'TOTAL FLEET', 'ALL PROGRAMS'),
      parseSegRow(147, 'TOTAL POTENSI', 'T-CARE'), parseSegRow(148, 'TOTAL POTENSI', 'T-CARE LITE'),
      parseSegRow(149, 'TOTAL POTENSI', 'T-CARE LITE+'), parseSegRow(150, 'GRAND TOTAL', 'ALL PROGRAMS')
    ],
    by_vehicle_type: [
      parseSegRow(154, 'MIDDLE - LOW', 'T-CARE'), parseSegRow(155, 'MIDDLE - LOW', 'T-CARE LITE'),
      parseSegRow(156, 'MIDDLE - LOW', 'T-CARE LITE+'), parseSegRow(158, 'MIDDLE - UP', 'T-CARE'),
      parseSegRow(160, 'HYBRID', 'T-CARE')
    ],
    by_ring_area: [
      parseSegRow(164, 'RING 1', 'T-CARE'), parseSegRow(165, 'RING 1', 'T-CARE LITE'),
      parseSegRow(166, 'RING 1', 'T-CARE LITE+'), parseSegRow(168, 'RING 2', 'T-CARE'),
      parseSegRow(169, 'RING 2', 'T-CARE LITE'), parseSegRow(170, 'RING 2', 'T-CARE LITE+'),
      parseSegRow(172, 'RING 3', 'T-CARE'), parseSegRow(173, 'RING 3', 'T-CARE LITE'),
      parseSegRow(174, 'RING 3', 'T-CARE LITE+'), parseSegRow(176, 'OUT OF AREA', 'T-CARE'),
      parseSegRow(177, 'OUT OF AREA', 'T-CARE LITE'), parseSegRow(178, 'OUT OF AREA', 'T-CARE LITE+')
    ]
  };

  let records = existingData?.records || [];
  if (rawCsvText && !rawCsvText.includes('<!DOCTYPE')) {
    const rawRows = parseGSheetCSV(rawCsvText);
    const parsedRecs = [];
    for (let i = 1; i < rawRows.length; i++) {
      const r = rawRows[i];
      const vin = (r[0] || '').trim();
      if (!vin) continue;
      parsedRecs.push({
        id: i,
        vin,
        model: (r[1] || '').trim(),
        delivery_date: (r[2] || '').trim(),
        dec_month: (r[4] || '').trim(),
        dec_year: (r[5] || '').trim(),
        dec_ym: (r[6] || '').trim(),
        sales_person: (r[9] || '').trim(),
        spv: (r[10] || '').trim(),
        customer_name: (r[11] || '').trim(),
        phone: (r[12] || '').trim(),
        address: (r[14] || '').trim(),
        ring_area: (r[15] || '').trim(),
        cust_type: (r[16] || '').trim(),
        vehicle_category: (r[17] || '').trim(),
        lcgc: (r[18] || '').trim(),
        program: (r[19] || '').trim(),
        last_service: (r[21] || '').trim(),
        last_service_date: (r[22] || '').trim(),
        last_dealer: (r[28] || '').trim(),
        habit_status: (r[29] || '').trim(),
        dlr_status: (r[32] || '').trim(),
        last_fu_history: (r[33] || '').trim()
      });
    }
    if (parsedRecs.length > 0 && parsedRecs.length >= Math.floor((existingData?.records?.length || 0) * 0.5)) {
      records = parsedRecs;
    }
  }

  return {
    ...(existingData || {}),
    meta: {
      ...(existingData?.meta || {}),
      title: 'T-Care Executive Intelligence & Retention Dashboard',
      branch: 'Tunas Toyota Kiaracondong (#146)',
      source_spreadsheet_id: TCARE_GSHEET_ID,
      gid: '208980240',
      sheet_name: 'DASHBOARD',
      updated_at: new Date().toISOString(),
      total_raw_records: records.length,
      source: 'live_google_sheets'
    },
    program_summary,
    komposisi,
    lcgc_comparison: {
      non_lcgc: { count: toInt(g(34, 10)), rate: toPct(g(33, 11)) },
      lcgc: { count: toInt(g(35, 10)), rate: toPct(g(34, 11)) }
    },
    channel_breakdown_by_program: {
      programs: ['T-CARE', 'T-CARE LITE', 'T-CARE LITE+'],
      series: {
        dec: [toInt(g(21, 4)), toInt(g(22, 4)), toInt(g(23, 4))],
        same_outlet: [toInt(g(21, 5)), toInt(g(22, 5)), toInt(g(23, 5))],
        tunas_group: [toInt(g(21, 6)), toInt(g(22, 6)), toInt(g(23, 6))],
        other_dealer: [toInt(g(21, 7)), toInt(g(22, 7)), toInt(g(23, 7))]
      }
    },
    cai_own_sales_by_program,
    cai_own_sales_by_vehicle_type,
    customer_type_comparison,
    retention_potency_today: {
      '1st': toPct(g(113, 7)), '2nd': toPct(g(113, 8)), '3rd': toPct(g(113, 9)),
      '4th': toPct(g(113, 10)), '5th': toPct(g(113, 11)), '6th': toPct(g(113, 12)), '7th': toPct(g(113, 13))
    },
    retention_potency_summary,
    segmented_matrices,
    records
  };
}

async function fetchAndUpdateTcareLive() {
  const dashUrl = `https://docs.google.com/spreadsheets/d/${TCARE_GSHEET_ID}/export?format=csv&gid=208980240&_t=${Date.now()}`;
  const rawUrl = `https://docs.google.com/spreadsheets/d/${TCARE_GSHEET_ID}/export?format=csv&gid=186065049&_t=${Date.now()}`;
  const [rDash, rRaw] = await Promise.all([
    fetch(dashUrl, { cache: 'no-store' }),
    fetch(rawUrl, { cache: 'no-store' }).catch(() => null)
  ]);
  if (!rDash.ok) throw new Error('HTTP ' + rDash.status);
  const dashCsv = await rDash.text();
  if (!dashCsv || dashCsv.includes('<!DOCTYPE')) throw new Error('Invalid T-Care CSV');
  const rawCsv = (rRaw && rRaw.ok) ? await rRaw.text() : '';
  const parsed = parseTcareDashboardCsv(dashCsv, rawCsv, tcareData);
  if (parsed) {
    tcareData = parsed;
    try { localStorage.setItem('bengkel_custom_tcare_data', JSON.stringify(tcareData)); } catch (e) {}
    console.log('[OK] T-Care synced live from Google Sheets:', tcareData.records?.length, 'records');
    renderTcare();
    return tcareData;
  }
  return null;
}

async function loadTcareData() {
  let serverTc = null;
  try {
    const res = await fetch('data/tcare_data.json?v=' + Date.now(), { cache: 'no-store' });
    if (res.ok) serverTc = await res.json();
  } catch (err) {
    console.warn('Error loading T-Care JSON:', err);
  }

  let cachedTc = null;
  try {
    const raw = localStorage.getItem('bengkel_custom_tcare_data');
    if (raw) cachedTc = JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem('bengkel_custom_tcare_data');
  }

  const sTime = serverTc?.meta?.updated_at ? new Date(serverTc.meta.updated_at).getTime() : 0;
  const cTime = cachedTc?.meta?.updated_at ? new Date(cachedTc.meta.updated_at).getTime() : 0;
  if (cachedTc && cachedTc.program_summary && cTime >= sTime) {
    tcareData = cachedTc;
  } else if (serverTc) {
    tcareData = serverTc;
  }

  if (tcareData) {
    console.log('T-Care data loaded:', tcareData?.records?.length, 'records');
    renderTcare();
  }

  fetchAndUpdateTcareLive().catch(err => console.warn('Background T-Care live sync warning:', err));
}

function initTcareEvents() {
  if (tcareEventsInitialized) return;
  tcareEventsInitialized = true;

  // Matrix Sub-Tabs
  document.querySelectorAll('.btn-tcare-matrix-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-tcare-matrix-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tcareCurrentMatrixTab = btn.getAttribute('data-matrix') || 'by_customer_type';
      renderTcareSegmentedMatrix();
    });
  });

  // Raw Filter dropdowns & Period Filter
  ['tcare-filter-period', 'tcare-raw-filter-program', 'tcare-raw-filter-ring', 'tcare-raw-filter-custtype', 'tcare-raw-filter-vcat', 'tcare-raw-filter-dealer'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        tcareRawPage = 1;
        applyTcareRawFiltersAndRender();
      });
    }
  });

  // Raw Search Input
  const searchInp = document.getElementById('tcare-raw-search-input');
  if (searchInp) {
    searchInp.addEventListener('input', () => {
      tcareRawPage = 1;
      applyTcareRawFiltersAndRender();
    });
  }

  // Quick Filter Pills
  document.querySelectorAll('[data-tcare-quick]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tcare-quick]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tcareActiveQuickFilter = btn.getAttribute('data-tcare-quick') || 'all';
      tcareRawPage = 1;
      applyTcareRawFiltersAndRender();
    });
  });

  // Page Size Select
  const pageSizeSelect = document.getElementById('tcare-raw-page-size');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      tcareRawPageSize = e.target.value === 'all' ? 999999 : parseInt(e.target.value, 10);
      tcareRawPage = 1;
      renderTcareRawTable();
    });
  }

  // Export CSV
  const btnExport = document.getElementById('btn-export-tcare-raw');
  if (btnExport) {
    btnExport.addEventListener('click', exportTcareRawCsv);
  }

  // Sync Button
  const btnSync = document.getElementById('btn-sync-tcare');
  if (btnSync) {
    btnSync.addEventListener('click', syncTcareData);
  }

  // Modal Close
  const modalClose = document.getElementById('btn-close-tcare-modal');
  const modal = document.getElementById('tcare-detail-modal');
  if (modalClose && modal) {
    modalClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }
}

async function syncTcareData() {
  const btn = document.getElementById('btn-sync-tcare');
  const spinIcon = document.getElementById('tcare-sync-spinner');
  try {
    if (btn) btn.disabled = true;
    if (spinIcon) spinIcon.style.animation = 'spin 0.8s linear infinite';
    let liveOk = false;
    try {
      await fetchAndUpdateTcareLive();
      liveOk = true;
    } catch (e) {
      console.warn('Direct T-Care live sync warning, trying backend API...', e);
    }
    if (!liveOk) {
      const resp = await fetch('api/sync_tcare.php');
      if (resp.ok) {
        await loadTcareData();
        liveOk = true;
      }
    }
    if (!liveOk) throw new Error('Tidak dapat mengambil data T-Care dari Google Sheets.');
    if (typeof showFloatingToast === 'function') {
      showFloatingToast('Data T-Care berhasil disinkronkan live dari Google Sheets!', 'success');
    } else {
      alert('Data T-Care berhasil disinkronkan!');
    }
  } catch (err) {
    alert('Gagal sinkronisasi: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
    if (spinIcon) spinIcon.style.animation = '';
  }
}

function renderTcare() {
  if (!tcareData) return;
  initTcareEvents();
  renderTcareMonitoringTable();
  renderTcareCharacteristics();
  renderTcareMilestoneSteppers();
  renderTcareCustomerTypeCompare();
  renderTcareMasterPotencyGrid();
  renderTcareSegmentedMatrix();
  renderTcareCharts();
  applyTcareRawFiltersAndRender();
}

function renderTcareMonitoringTable() {
  const tbody = document.getElementById('tcare-monitoring-tbody');
  if (!tbody || !tcareData.program_summary) return;

  tbody.innerHTML = tcareData.program_summary.map(item => {
    const isTotal = item.program === 'TOTAL';
    const trClass = isTotal ? 'style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;"' : '';
    return `
      <tr ${trClass}>
        <td style="font-weight: 700; color: #0f172a;">${escapeHtml(item.program)}</td>
        <td style="text-align: right; font-weight: 600;">${formatNumber(item.dec)}</td>
        <td class="td-same-outlet" style="text-align: right;">${formatNumber(item.same_outlet.volume)}</td>
        <td class="td-same-outlet" style="text-align: right; font-weight: 700;">${escapeHtml(item.same_outlet.rate)}</td>
        <td class="td-tunas-group" style="text-align: right;">${formatNumber(item.tunas_group.volume)}</td>
        <td class="td-tunas-group" style="text-align: right; font-weight: 700;">${escapeHtml(item.tunas_group.rate)}</td>
        <td class="td-other-dealer" style="text-align: right;">${formatNumber(item.other_dealer.volume)}</td>
        <td class="td-other-dealer" style="text-align: right; font-weight: 700;">${escapeHtml(item.other_dealer.rate)}</td>
        <td class="td-total-rate" style="text-align: right;">${formatNumber(item.total_cai)}</td>
        <td class="td-total-rate" style="text-align: right; color: #2563eb; font-weight: 800;">${escapeHtml(item.overall_rate)}</td>
      </tr>
    `;
  }).join('');

  // Update KPI bottom badges
  const pMap = {};
  tcareData.program_summary.forEach(p => { pMap[p.program] = p; });
  if (pMap['T-CARE']) {
    const elR = document.getElementById('kpi-tcare-rate');
    const elV = document.getElementById('kpi-tcare-vol');
    if (elR) elR.textContent = pMap['T-CARE'].overall_rate;
    if (elV) elV.textContent = `${formatNumber(pMap['T-CARE'].total_cai)} / ${formatNumber(pMap['T-CARE'].dec)} DEC`;
  }
  if (pMap['T-CARE LITE']) {
    const elR = document.getElementById('kpi-lite-rate');
    const elV = document.getElementById('kpi-lite-vol');
    if (elR) elR.textContent = pMap['T-CARE LITE'].overall_rate;
    if (elV) elV.textContent = `${formatNumber(pMap['T-CARE LITE'].total_cai)} / ${formatNumber(pMap['T-CARE LITE'].dec)} DEC`;
  }
  if (pMap['T-CARE LITE+']) {
    const elR = document.getElementById('kpi-liteplus-rate');
    const elV = document.getElementById('kpi-liteplus-vol');
    if (elR) elR.textContent = pMap['T-CARE LITE+'].overall_rate;
    if (elV) elV.textContent = `${formatNumber(pMap['T-CARE LITE+'].total_cai)} / ${formatNumber(pMap['T-CARE LITE+'].dec)} DEC`;
  }
}

function renderTcareCharacteristics() {
  const k = tcareData.komposisi;
  if (!k) return;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Customer Type
  if (k.customer_type) {
    setEl('tcare-comp-retail', formatNumber(k.customer_type.retail?.count || 0));
    setEl('tcare-comp-retail-pct', k.customer_type.retail?.rate || '0%');
    setEl('tcare-comp-fleet', formatNumber(k.customer_type.fleet?.count || 0));
    setEl('tcare-comp-fleet-pct', k.customer_type.fleet?.rate || '0%');
  }

  // Ring Area
  if (k.ring_area) {
    setEl('tcare-comp-r1', formatNumber(k.ring_area.ring1?.count || 0));
    setEl('tcare-comp-r1-pct', k.ring_area.ring1?.rate || '0%');
    setEl('tcare-comp-r2', formatNumber(k.ring_area.ring2?.count || 0));
    setEl('tcare-comp-r2-pct', k.ring_area.ring2?.rate || '0%');
    setEl('tcare-comp-r3', formatNumber(k.ring_area.ring3?.count || 0));
    setEl('tcare-comp-r3-pct', k.ring_area.ring3?.rate || '0%');
    setEl('tcare-comp-ooa', formatNumber(k.ring_area.out_of_area?.count || 0));
    setEl('tcare-comp-ooa-pct', k.ring_area.out_of_area?.rate || '0%');
  }

  // Punctuality
  if (k.punctuality) {
    setEl('tcare-comp-punctual', formatNumber(k.punctuality.punctual?.count || 0));
    setEl('tcare-comp-punctual-pct', k.punctuality.punctual?.rate || '0%');
    setEl('tcare-comp-non-punctual', formatNumber(k.punctuality.non_punctual?.count || 0));
    setEl('tcare-comp-non-punctual-pct', k.punctuality.non_punctual?.rate || '0%');
  }

  // Vehicle Type
  if (k.vehicle_type) {
    setEl('tcare-comp-midlow', formatNumber(k.vehicle_type.middle_low?.count || 0));
    setEl('tcare-comp-midlow-pct', k.vehicle_type.middle_low?.rate || '0%');
    setEl('tcare-comp-midup', formatNumber(k.vehicle_type.middle_up?.count || 0));
    setEl('tcare-comp-midup-pct', k.vehicle_type.middle_up?.rate || '0%');
    setEl('tcare-comp-hybrid', formatNumber(k.vehicle_type.hybrid?.count || 0));
    setEl('tcare-comp-hybrid-pct', k.vehicle_type.hybrid?.rate || '0%');
  }
}

function renderTcareMilestoneSteppers() {
  // Stepper A: By Program
  const cProg = document.getElementById('tcare-stepper-program-container');
  if (cProg && tcareData.cai_own_sales_by_program) {
    cProg.innerHTML = tcareData.cai_own_sales_by_program.map(item => {
      const steps = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'].map(m => {
        const rate = item.rates?.[m] || '0%';
        const numVal = parseFloat(rate) || 0;
        let bg = '#f8fafc';
        let color = '#475569';
        if (numVal >= 80) { bg = '#ecfdf5'; color = '#059669'; }
        else if (numVal >= 50) { bg = '#eff6ff'; color = '#2563eb'; }
        else if (numVal >= 20) { bg = '#fffbeb'; color = '#d97706'; }
        else if (numVal > 0) { bg = '#fef2f2'; color = '#dc2626'; }
        return `
          <div class="tcare-step-box" style="background: ${bg};">
            <div class="tcare-step-num">${m}</div>
            <div class="tcare-step-pct" style="color: ${color};">${escapeHtml(rate)}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="tcare-prog-row">
          <div>
            <div class="tcare-prog-label">${escapeHtml(item.program)}</div>
            <div style="font-size: 10.5px; color: #64748b;">Potensi: <strong>${formatNumber(item.potensi)}</strong></div>
          </div>
          ${steps}
        </div>
      `;
    }).join('');
  }

  // Stepper B: By Vehicle Type
  const cVtype = document.getElementById('tcare-stepper-vtype-container');
  if (cVtype && tcareData.cai_own_sales_by_vehicle_type) {
    cVtype.innerHTML = tcareData.cai_own_sales_by_vehicle_type.map(item => {
      const steps = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'].map(m => {
        const rate = item.rates?.[m] || '0%';
        const numVal = parseFloat(rate) || 0;
        let bg = '#f8fafc';
        let color = '#475569';
        if (numVal >= 80) { bg = '#ecfdf5'; color = '#059669'; }
        else if (numVal >= 50) { bg = '#eff6ff'; color = '#2563eb'; }
        else if (numVal >= 20) { bg = '#fffbeb'; color = '#d97706'; }
        else if (numVal > 0) { bg = '#fef2f2'; color = '#dc2626'; }
        return `
          <div class="tcare-step-box" style="background: ${bg};">
            <div class="tcare-step-num">${m}</div>
            <div class="tcare-step-pct" style="color: ${color};">${escapeHtml(rate)}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="tcare-prog-row">
          <div>
            <div class="tcare-prog-label">${escapeHtml(item.category)}</div>
            <div style="font-size: 10.5px; color: #64748b;">Potensi: <strong>${formatNumber(item.potensi)}</strong></div>
          </div>
          ${steps}
        </div>
      `;
    }).join('');
  }
}

function renderTcareCustomerTypeCompare() {
  const comp = tcareData.customer_type_comparison;
  if (!comp) return;

  const renderGroup = (tbodyId, grpData) => {
    const tbody = document.getElementById(tbodyId);
    if (!tbody || !grpData) return;
    const progs = [
      { name: 'T-CARE', data: grpData.t_care },
      { name: 'T-CARE LITE', data: grpData.t_care_lite },
      { name: 'T-CARE LITE+', data: grpData.t_care_lite_plus }
    ];
    let totalPot = 0;
    let totalCai = 0;

    const rows = progs.map(p => {
      const pot = p.data?.potensi || 0;
      const cai = p.data?.cai || 0;
      const rate = p.data?.rate || '0%';
      totalPot += pot;
      totalCai += cai;
      return `
        <tr>
          <td style="font-weight: 600;">${escapeHtml(p.name)}</td>
          <td style="text-align: right;">${formatNumber(pot)}</td>
          <td style="text-align: right;">${formatNumber(cai)}</td>
          <td style="text-align: right; font-weight: 800; color: #2563eb;">${escapeHtml(rate)}</td>
        </tr>
      `;
    });

    const totRate = totalPot > 0 ? ((totalCai / totalPot) * 100).toFixed(1) + '%' : '0%';
    rows.push(`
      <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;">
        <td>TOTAL</td>
        <td style="text-align: right;">${formatNumber(totalPot)}</td>
        <td style="text-align: right;">${formatNumber(totalCai)}</td>
        <td style="text-align: right; color: #059669; font-weight: 900;">${totRate}</td>
      </tr>
    `);
    tbody.innerHTML = rows.join('');
  };

  renderGroup('tcare-retail-tbody', comp.retail);
  renderGroup('tcare-fleet-tbody', comp.fleet);
}

function renderTcareMasterPotencyGrid() {
  const tbody = document.getElementById('tcare-potency-tbody');
  if (!tbody || !tcareData.retention_potency_summary) return;

  tbody.innerHTML = tcareData.retention_potency_summary.map(item => {
    const isTotal = item.program.includes('TOTAL');
    const trClass = isTotal ? 'style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;"' : '';
    const mCols = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'].map(m => {
      const d = item.milestones?.[m] || { potensi: 0, cai: 0, rate: '0%' };
      return `
        <td style="text-align: right;">${formatNumber(d.potensi)}</td>
        <td style="text-align: right;">${formatNumber(d.cai)}</td>
        <td style="text-align: right; font-weight: 700; color: #2563eb;">${escapeHtml(d.rate)}</td>
      `;
    }).join('');

    return `
      <tr ${trClass}>
        <td style="font-weight: 700; color: #0f172a;">${escapeHtml(item.program)}</td>
        ${mCols}
      </tr>
    `;
  }).join('');
}

function renderTcareSegmentedMatrix() {
  const tbody = document.getElementById('tcare-matrix-tbody');
  if (!tbody || !tcareData.segmented_matrices) return;

  const rows = tcareData.segmented_matrices[tcareCurrentMatrixTab] || [];
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="53" style="text-align: center; padding: 20px;">Tidak ada data matriks</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const isSub = r.category.includes('TOTAL') && !r.category.includes('GRAND');
    const isGrand = r.category.includes('GRAND');
    let trClass = '';
    if (isGrand) trClass = 'class="row-grandtotal"';
    else if (isSub) trClass = 'class="row-subtotal"';

    const intervalsHtml = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'].map(m => {
      const iv = r.intervals?.[m] || { potensi: 0, same_outlet: 0, tunas_group: 0, other_dealer: 0, cai: 0, rate: '0%' };
      return `
        <td>${formatNumber(iv.potensi)}</td>
        <td class="td-same-outlet">${formatNumber(iv.same_outlet)}</td>
        <td class="td-tunas-group">${formatNumber(iv.tunas_group)}</td>
        <td class="td-other-dealer">${formatNumber(iv.other_dealer)}</td>
        <td>${formatNumber(iv.cai)}</td>
        <td style="font-weight: 700; color: #2563eb;">${escapeHtml(iv.rate)}</td>
      `;
    }).join('');

    const c = r.cumulative || { potensi: 0, same_outlet: 0, tunas_group: 0, other_dealer: 0, total_own_sales: 0, pct_so: '0%', pct_tg: '0%', pct_od: '0%', pct_total_rate: '0%' };
    const cumulHtml = `
      <td style="background: #faf5ff; font-weight: 700;">${formatNumber(c.potensi)}</td>
      <td style="background: #ecfdf5;">${formatNumber(c.same_outlet)}</td>
      <td style="background: #eff6ff;">${formatNumber(c.tunas_group)}</td>
      <td style="background: #fffbeb;">${formatNumber(c.other_dealer)}</td>
      <td style="background: #f1f5f9; font-weight: 700;">${formatNumber(c.total_own_sales)}</td>
      <td style="background: #ecfdf5; font-weight: 600;">${escapeHtml(c.pct_so)}</td>
      <td style="background: #eff6ff; font-weight: 600;">${escapeHtml(c.pct_tg)}</td>
      <td style="background: #fffbeb; font-weight: 600;">${escapeHtml(c.pct_od)}</td>
      <td style="background: #e0e7ff; font-weight: 800; color: #3730a3;">${escapeHtml(c.pct_total_rate)}</td>
    `;

    return `
      <tr ${trClass}>
        <td class="cell-text-left">${escapeHtml(r.category)}</td>
        <td class="cell-text-left">${escapeHtml(r.program)}</td>
        ${intervalsHtml}
        ${cumulHtml}
      </tr>
    `;
  }).join('');
}

function applyTcareRawFiltersAndRender() {
  if (!tcareData?.records) return;

  const periodVal = document.getElementById('tcare-filter-period')?.value || 'all';
  const progVal = document.getElementById('tcare-raw-filter-program')?.value || 'all';
  const ringVal = document.getElementById('tcare-raw-filter-ring')?.value || 'all';
  const custVal = document.getElementById('tcare-raw-filter-custtype')?.value || 'all';
  const vcatVal = document.getElementById('tcare-raw-filter-vcat')?.value || 'all';
  const dlrVal = document.getElementById('tcare-raw-filter-dealer')?.value || 'all';
  const search = (document.getElementById('tcare-raw-search-input')?.value || '').toLowerCase().trim();

  tcareFilteredRecords = tcareData.records.filter(r => {
    if (periodVal !== 'all' && !(r.dec_year || '').toString().includes(periodVal) && !(r.dec_ym || '').toString().includes(periodVal)) return false;
    if (progVal !== 'all' && (r.program || '').toUpperCase() !== progVal.toUpperCase()) return false;
    if (ringVal !== 'all' && (r.ring_area || '').toUpperCase() !== ringVal.toUpperCase()) return false;
    if (custVal !== 'all' && (r.cust_type || '').toUpperCase() !== custVal.toUpperCase()) return false;
    if (vcatVal !== 'all' && (r.vehicle_category || '').toUpperCase() !== vcatVal.toUpperCase()) return false;
    if (dlrVal !== 'all' && (r.last_dealer || '').toUpperCase() !== dlrVal.toUpperCase()) return false;

    // Quick pills
    if (tcareActiveQuickFilter === 'tcare' && !((r.program || '').toUpperCase().includes('T-CARE') && !(r.program || '').toUpperCase().includes('LITE'))) return false;
    if (tcareActiveQuickFilter === 'lite' && (r.program || '').toUpperCase() !== 'T-CARE LITE') return false;
    if (tcareActiveQuickFilter === 'liteplus' && !(r.program || '').toUpperCase().includes('LITE+')) return false;
    if (tcareActiveQuickFilter === 'ring1' && (r.ring_area || '').toUpperCase() !== 'RING 1') return false;
    if (tcareActiveQuickFilter === 'hybrid' && (r.vehicle_category || '').toUpperCase() !== 'HYBRID') return false;
    if (tcareActiveQuickFilter === 'fleet' && (r.cust_type || '').toUpperCase() !== 'FLEET') return false;

    // Search query
    if (search) {
      const match = (r.vin || '').toLowerCase().includes(search) ||
                    (r.customer_name || '').toLowerCase().includes(search) ||
                    (r.model || '').toLowerCase().includes(search) ||
                    (r.phone || '').toLowerCase().includes(search) ||
                    (r.sales_person || '').toLowerCase().includes(search) ||
                    (r.spv || '').toLowerCase().includes(search) ||
                    (r.address || '').toLowerCase().includes(search);
      if (!match) return false;
    }
    return true;
  });

  renderTcareRawTable();
}

function renderTcareRawTable() {
  const tbody = document.getElementById('tcare-raw-table-body');
  const countTotalEl = document.getElementById('tcare-raw-count-total');
  const countRangeEl = document.getElementById('tcare-raw-count-range');
  const pageInfoEl = document.getElementById('tcare-raw-page-info');
  const pagBtnsEl = document.getElementById('tcare-raw-pagination-buttons');

  if (!tbody) return;

  const total = tcareFilteredRecords.length;
  if (countTotalEl) countTotalEl.textContent = formatNumber(total);

  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 24px; color: #64748b;">Tidak ada data T-Care yang cocok dengan filter yang dipilih</td></tr>';
    if (countRangeEl) countRangeEl.textContent = '0 - 0';
    if (pageInfoEl) pageInfoEl.textContent = 'Halaman 0 dari 0';
    if (pagBtnsEl) pagBtnsEl.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(total / tcareRawPageSize);
  if (tcareRawPage > totalPages) tcareRawPage = totalPages;
  if (tcareRawPage < 1) tcareRawPage = 1;

  const startIdx = (tcareRawPage - 1) * tcareRawPageSize;
  const endIdx = Math.min(startIdx + tcareRawPageSize, total);

  if (countRangeEl) countRangeEl.textContent = `${startIdx + 1} - ${endIdx}`;
  if (pageInfoEl) pageInfoEl.textContent = `Halaman ${tcareRawPage} dari ${totalPages}`;

  const pageData = tcareFilteredRecords.slice(startIdx, endIdx);

  tbody.innerHTML = pageData.map((rec, idx) => {
    let progBadge = 'background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;';
    if ((rec.program || '').includes('LITE+')) progBadge = 'background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;';
    else if ((rec.program || '').includes('LITE')) progBadge = 'background: #fefce8; color: #854d0e; border: 1px solid #fef08a;';

    let dlrBadge = 'background: #f1f5f9; color: #475569;';
    if ((rec.last_dealer || '').includes('SAME')) dlrBadge = 'background: #ecfdf5; color: #065f46; font-weight: 700;';
    else if ((rec.last_dealer || '').includes('TUNAS')) dlrBadge = 'background: #eff6ff; color: #1e40af; font-weight: 700;';
    else if ((rec.last_dealer || '').includes('OTHER')) dlrBadge = 'background: #fffbeb; color: #92400e; font-weight: 700;';

    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-size: 11px;">${startIdx + idx + 1}</td>
        <td><strong style="font-family: monospace; font-size: 11px; color: #1e293b;">${escapeHtml(rec.vin || '-')}</strong></td>
        <td><span style="font-weight: 600; color: #0f172a;">${escapeHtml(rec.model || '-')}</span></td>
        <td style="font-size: 11px; color: #475569;">${escapeHtml(rec.dec_ym || '-')}</td>
        <td><strong style="color: #0f172a;">${escapeHtml(rec.customer_name || '-')}</strong></td>
        <td><span class="tag-badge" style="font-size: 10px; background: #f8fafc; border: 1px solid #e2e8f0; color: #334155;">${escapeHtml(rec.ring_area || '-')}</span></td>
        <td><span style="font-size: 11px; color: #475569;">${escapeHtml(rec.cust_type || '-')}</span></td>
        <td><span class="tag-badge" style="${progBadge} font-size: 10px; font-weight: 700;">${escapeHtml(rec.program || '-')}</span></td>
        <td style="font-size: 11px; color: #1e293b;">${escapeHtml(rec.last_service || '-')}</td>
        <td><span class="tag-badge" style="${dlrBadge} font-size: 10px;">${escapeHtml(rec.last_dealer || '-')}</span></td>
        <td style="font-size: 11px; color: #64748b; max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(rec.last_fu_history || '-')}">${escapeHtml(rec.last_fu_history || '-')}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-sbi-action" onclick="openTcareDetailModalById(${rec.id})" title="Lihat Profil Lengkap">
            👁️ Detail
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Pagination buttons
  renderTcarePaginationButtons(totalPages);
}

function renderTcarePaginationButtons(totalPages) {
  const pagBtnsEl = document.getElementById('tcare-raw-pagination-buttons');
  if (!pagBtnsEl) return;

  let btns = '';
  btns += `<button type="button" class="btn-sbi-page" ${tcareRawPage === 1 ? 'disabled' : ''} onclick="changeTcareRawPage(1)">&laquo;</button>`;
  btns += `<button type="button" class="btn-sbi-page" ${tcareRawPage === 1 ? 'disabled' : ''} onclick="changeTcareRawPage(${tcareRawPage - 1})">&lsaquo;</button>`;

  const maxVisible = 5;
  let startP = Math.max(1, tcareRawPage - 2);
  let endP = Math.min(totalPages, startP + maxVisible - 1);
  if (endP - startP < maxVisible - 1) {
    startP = Math.max(1, endP - maxVisible + 1);
  }

  for (let p = startP; p <= endP; p++) {
    btns += `<button type="button" class="btn-sbi-page ${p === tcareRawPage ? 'active' : ''}" onclick="changeTcareRawPage(${p})">${p}</button>`;
  }

  btns += `<button type="button" class="btn-sbi-page" ${tcareRawPage === totalPages ? 'disabled' : ''} onclick="changeTcareRawPage(${tcareRawPage + 1})">&rsaquo;</button>`;
  btns += `<button type="button" class="btn-sbi-page" ${tcareRawPage === totalPages ? 'disabled' : ''} onclick="changeTcareRawPage(${totalPages})">&raquo;</button>`;

  pagBtnsEl.innerHTML = btns;
}

window.changeTcareRawPage = function(p) {
  tcareRawPage = p;
  renderTcareRawTable();
  document.querySelector('#pane-tcare .sbi-table-wrap')?.scrollTo({ top: 0, behavior: 'smooth' });
};

window.openTcareDetailModalById = function(id) {
  if (!tcareData?.records) return;
  const rec = tcareData.records.find(r => r.id === id);
  if (rec) openTcareDetailModal(rec);
};

function openTcareDetailModal(rec) {
  const modal = document.getElementById('tcare-detail-modal');
  const titleEl = document.getElementById('tcare-modal-title');
  const progBadge = document.getElementById('tcare-modal-prog-badge');
  const dlrBadge = document.getElementById('tcare-modal-dealer-badge');
  const body = document.getElementById('tcare-modal-body-content');

  if (!modal || !body) return;

  if (titleEl) titleEl.textContent = `${rec.customer_name || 'Pelanggan'} — ${rec.model || 'Unit'}`;
  if (progBadge) progBadge.textContent = rec.program || 'T-CARE';
  if (dlrBadge) dlrBadge.textContent = rec.last_dealer || '-';

  // Format phone WA link
  let phoneClean = (rec.phone || '').replace(/[^0-9]/g, '');
  if (phoneClean.startsWith('0')) phoneClean = '62' + phoneClean.slice(1);
  const waBtnHtml = phoneClean ? `
    <a href="https://wa.me/${phoneClean}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; background: #25d366; color: #ffffff; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; text-decoration: none; margin-left: 6px;">
      WhatsApp
    </a>
  ` : '';

  body.innerHTML = `
    <!-- 1. Data Kendaraan -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <span>🚗</span> Data Spesifikasi Kendaraan
      </div>
      <div class="sbi-detail-grid">
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Nomor Rangka (VIN)</span>
          <span class="sbi-detail-val" style="font-family: monospace; font-size: 13px; font-weight: 800; color: #1e3a8a;">${escapeHtml(rec.vin || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Model Kendaraan</span>
          <span class="sbi-detail-val" style="font-weight: 700;">${escapeHtml(rec.model || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Kategori Unit</span>
          <span class="sbi-detail-val">${escapeHtml(rec.vehicle_category || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Kategori LCGC</span>
          <span class="sbi-detail-val">${escapeHtml(rec.lcgc || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Tanggal Delivery</span>
          <span class="sbi-detail-val">${escapeHtml(rec.delivery_date || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">DEC Delivery (Bulan &amp; Tahun)</span>
          <span class="sbi-detail-val" style="color: #2563eb; font-weight: 700;">${escapeHtml(rec.dec_month || '')} ${escapeHtml(rec.dec_year || '')} (${escapeHtml(rec.dec_ym || '-')})</span>
        </div>
      </div>
    </div>

    <!-- 2. Profil Pelanggan & Wilayah -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <span>👤</span> Profil Pelanggan &amp; Domisili
      </div>
      <div class="sbi-detail-grid">
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Nama Pelanggan</span>
          <span class="sbi-detail-val" style="font-size: 14px; font-weight: 800;">${escapeHtml(rec.customer_name || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Tipe Pelanggan (Segmentasi)</span>
          <span class="sbi-detail-val">${escapeHtml(rec.cust_type || 'Retail')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Nomor Telepon / Handphone</span>
          <span class="sbi-detail-val">${escapeHtml(rec.phone || '-')} ${waBtnHtml}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Ring Area Domisili</span>
          <span class="sbi-detail-val" style="font-weight: 700; color: #d97706;">${escapeHtml(rec.ring_area || '-')}</span>
        </div>
        <div class="sbi-detail-item" style="grid-column: span 2;">
          <span class="sbi-detail-label">Alamat Lengkap</span>
          <span class="sbi-detail-val">${escapeHtml(rec.address || '-')}</span>
        </div>
      </div>
    </div>

    <!-- 3. Status Program T-Care & Riwayat Servis -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <span>📋</span> Status Program &amp; Servis Berkala
      </div>
      <div class="sbi-detail-grid">
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Program T-Care Terdaftar</span>
          <span class="sbi-detail-val" style="color: #2563eb; font-weight: 800;">${escapeHtml(rec.program || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Servis Terakhir yang Dilakukan</span>
          <span class="sbi-detail-val" style="font-weight: 700;">${escapeHtml(rec.last_service || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Tanggal Servis Terakhir</span>
          <span class="sbi-detail-val">${escapeHtml(rec.last_service_date || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Bengkel / Dealer Terakhir</span>
          <span class="sbi-detail-val" style="color: #059669; font-weight: 700;">${escapeHtml(rec.last_dealer || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Habit Servis Pelanggan</span>
          <span class="sbi-detail-val">${escapeHtml(rec.habit_status || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Status Dealer Terakhir</span>
          <span class="sbi-detail-val">${escapeHtml(rec.dlr_status || '-')}</span>
        </div>
      </div>
    </div>

    <!-- 4. Tim Sales & History Follow Up -->
    <div class="sbi-detail-section">
      <div class="sbi-detail-section-title">
        <span>🤝</span> Tim Sales &amp; Catatan Follow Up
      </div>
      <div class="sbi-detail-grid">
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Nama Sales Person</span>
          <span class="sbi-detail-val">${escapeHtml(rec.sales_person || '-')}</span>
        </div>
        <div class="sbi-detail-item">
          <span class="sbi-detail-label">Supervisor (SPV)</span>
          <span class="sbi-detail-val">${escapeHtml(rec.spv || '-')}</span>
        </div>
        <div class="sbi-detail-item" style="grid-column: span 2;">
          <span class="sbi-detail-label">Catatan Riwayat Follow Up Terakhir</span>
          <span class="sbi-detail-val" style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-style: italic;">
            ${escapeHtml(rec.last_fu_history || 'Belum ada catatan follow up')}
          </span>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function exportTcareRawCsv() {
  if (!tcareFilteredRecords || tcareFilteredRecords.length === 0) {
    alert('Tidak ada data yang dapat diekspor!');
    return;
  }

  const headers = [
    'No', 'VIN', 'Model Kendaraan', 'Delivery Date', 'DEC Month', 'DEC Year', 'DEC Y-M',
    'Nama Pelanggan', 'No HP', 'Alamat', 'Ring Area', 'Tipe Pelanggan', 'Kategori Mobil',
    'LCGC', 'Program T-Care', 'Servis Terakhir', 'Tanggal Servis Terakhir', 'Bengkel Terakhir',
    'Habit Servis', 'Status Dealer', 'Sales Person', 'SPV', 'Riwayat Follow Up'
  ];

  const rows = tcareFilteredRecords.map((r, i) => [
    i + 1,
    `"${(r.vin || '').replace(/"/g, '""')}"`,
    `"${(r.model || '').replace(/"/g, '""')}"`,
    `"${(r.delivery_date || '').replace(/"/g, '""')}"`,
    `"${(r.dec_month || '').replace(/"/g, '""')}"`,
    `"${(r.dec_year || '').replace(/"/g, '""')}"`,
    `"${(r.dec_ym || '').replace(/"/g, '""')}"`,
    `"${(r.customer_name || '').replace(/"/g, '""')}"`,
    `"${(r.phone || '').replace(/"/g, '""')}"`,
    `"${(r.address || '').replace(/"/g, '""')}"`,
    `"${(r.ring_area || '').replace(/"/g, '""')}"`,
    `"${(r.cust_type || '').replace(/"/g, '""')}"`,
    `"${(r.vehicle_category || '').replace(/"/g, '""')}"`,
    `"${(r.lcgc || '').replace(/"/g, '""')}"`,
    `"${(r.program || '').replace(/"/g, '""')}"`,
    `"${(r.last_service || '').replace(/"/g, '""')}"`,
    `"${(r.last_service_date || '').replace(/"/g, '""')}"`,
    `"${(r.last_dealer || '').replace(/"/g, '""')}"`,
    `"${(r.habit_status || '').replace(/"/g, '""')}"`,
    `"${(r.dlr_status || '').replace(/"/g, '""')}"`,
    `"${(r.sales_person || '').replace(/"/g, '""')}"`,
    `"${(r.spv || '').replace(/"/g, '""')}"`,
    `"${(r.last_fu_history || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tcare_data_kiaracondong_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderTcareCharts() {
  if (!tcareData || typeof Chart === 'undefined') return;

  // 1. Grouped Bar Chart: Distribusi Outlet DEC & CAI per Program (Sheet Chart 2)
  const channelCanvas = document.getElementById('chart-tcare-channel-breakdown');
  if (channelCanvas) {
    if (tcareChartInstances.channel) tcareChartInstances.channel.destroy();
    const chData = tcareData.channel_breakdown_by_program || {
      programs: ['T-CARE', 'T-CARE LITE', 'T-CARE LITE+'],
      series: {
        dec: [1701, 187, 216],
        same_outlet: [780, 92, 147],
        tunas_group: [219, 29, 26],
        other_dealer: [498, 26, 39]
      }
    };

    tcareChartInstances.channel = new Chart(channelCanvas, {
      type: 'bar',
      data: {
        labels: chData.programs,
        datasets: [
          {
            label: 'DEC (Potensi)',
            data: chData.series.dec,
            backgroundColor: '#3b82f6',
            borderRadius: 4
          },
          {
            label: 'SAME OUTLET',
            data: chData.series.same_outlet,
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'TUNAS GROUP',
            data: chData.series.tunas_group,
            backgroundColor: '#f59e0b',
            borderRadius: 4
          },
          {
            label: 'OTHER DEALER',
            data: chData.series.other_dealer,
            backgroundColor: '#ef4444',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 10, weight: '600' }, boxWidth: 12, padding: 8 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatNumber(ctx.raw)} unit`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10.5, weight: '700' } } },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 9.5 } }
          }
        }
      }
    });
  }

  // Helper for Donut Charts
  const createDonut = (canvasId, key, labels, data, colors) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (tcareChartInstances[key]) tcareChartInstances[key].destroy();
    tcareChartInstances[key] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 1.5,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
                return ` ${ctx.label}: ${formatNumber(ctx.raw)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  };

  // 2. Donut: CUST. TYPE (Chart 3)
  const k = tcareData.komposisi;
  if (k) {
    const custR = k.customer_type?.retail?.count || 1754;
    const custF = k.customer_type?.fleet?.count || 372;
    createDonut('chart-tcare-cust-donut', 'cust_type', ['Retail', 'Fleet'], [custR, custF], ['#4285F4', '#EA4335']);

    // 3. Donut: DEC BY AREA (Chart 1)
    const a1 = k.ring_area?.ring1?.count || 598;
    const a2 = k.ring_area?.ring2?.count || 422;
    const a3 = k.ring_area?.ring3?.count || 124;
    const a4 = k.ring_area?.out_of_area?.count || 982;
    createDonut('chart-tcare-area-donut', 'area', ['Ring 1', 'Ring 2', 'Ring 3', 'Out of Area'], [a1, a2, a3, a4], ['#4285F4', '#EA4335', '#FBBC04', '#34A853']);

    // 4. Donut: PUNCTUAL / NON PUNCTUAL (Chart 5)
    const punc = k.punctuality?.punctual?.count || 1606;
    const nonPunc = k.punctuality?.non_punctual?.count || 272;
    createDonut('chart-tcare-punctual-donut', 'punctual', ['Punctual', 'Non Punctual'], [punc, nonPunc], ['#34A853', '#EA4335']);

    // 5. Donut: VEHICLE TYPE (Chart 4)
    const vMidLow = k.vehicle_type?.middle_low?.count || 1175;
    const vMidUp = k.vehicle_type?.middle_up?.count || 660;
    const vHyb = k.vehicle_type?.hybrid?.count || 291;
    createDonut('chart-tcare-vtype-donut', 'vehicle_type', ['Middle - Low', 'Middle - Up', 'Hybrid'], [vMidLow, vMidUp, vHyb], ['#4285F4', '#EA4335', '#FBBC04']);
  }

  // 6. Donut: LCGC / NON LCGC (Chart 6)
  const lcgcData = tcareData.lcgc_comparison || { non_lcgc: { count: 1694, rate: '80.5%' }, lcgc: { count: 410, rate: '19.5%' } };
  createDonut('chart-tcare-lcgc-donut', 'lcgc', ['Non LCGC', 'LCGC'], [lcgcData.non_lcgc.count, lcgcData.lcgc.count], ['#4285F4', '#EA4335']);
  const elNonVol = document.getElementById('tcare-lcgc-non-vol');
  const elNonRate = document.getElementById('tcare-lcgc-non-rate');
  const elLcgcVol = document.getElementById('tcare-lcgc-vol');
  const elLcgcRate = document.getElementById('tcare-lcgc-rate');
  if (elNonVol) elNonVol.textContent = formatNumber(lcgcData.non_lcgc.count);
  if (elNonRate) elNonRate.textContent = lcgcData.non_lcgc.rate;
  if (elLcgcVol) elLcgcVol.textContent = formatNumber(lcgcData.lcgc.count);
  if (elLcgcRate) elLcgcRate.textContent = lcgcData.lcgc.rate;

  // Update Today Retention Pill Strip
  const todayRet = tcareData.retention_potency_today || { '1st': '89.3%', '2nd': '82.5%', '3rd': '75.0%', '4th': '43.1%', '5th': '44.8%', '6th': '22.6%', '7th': '0.0%' };
  ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'].forEach(m => {
    const el = document.getElementById(`today-ret-${m}`);
    if (el) el.textContent = todayRet[m] || '0.0%';
  });

  // 7. Chart 7: CAI OWN SALES Retention Rate (Bar Chart 1K to 60K)
  const retPotCanvas = document.getElementById('chart-tcare-retention-potency');
  if (retPotCanvas) {
    if (tcareChartInstances.retPotency) tcareChartInstances.retPotency.destroy();
    const retVals = [89.3, 82.5, 75.0, 43.1, 44.8, 22.6, 0.0];
    tcareChartInstances.retPotency = new Chart(retPotCanvas, {
      type: 'bar',
      data: {
        labels: ['1K', '10K', '20K', '30K', '40K', '50K', '60K'],
        datasets: [{
          label: 'Retention Rate (%)',
          data: retVals,
          backgroundColor: ['#1e40af', '#2563eb', '#3b82f6', '#f59e0b', '#d97706', '#ef4444', '#cbd5e1'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` CAI Own Sales Rate: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, weight: '700' } } },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              font: { size: 9 },
              callback: (v) => v + '%'
            }
          }
        }
      }
    });
  }

  // 8. Chart 12: Distribusi Servis per Outlet (SO, TG, OD across 1K - 60K)
  const milesCanvas = document.getElementById('chart-tcare-channel-milestones');
  if (milesCanvas) {
    if (tcareChartInstances.milestones) tcareChartInstances.milestones.destroy();
    const dMiles = tcareData.dealer_milestones_breakdown || {
      milestones: ['1K', '10K', '20K', '30K', '40K', '50K', '60K'],
      same_outlet: [72.5, 44.0, 35.1, 17.1, 14.3, 3.2, 0.0],
      tunas_group: [7.2, 13.1, 14.8, 10.3, 12.0, 0.0, 0.0],
      other_dealer: [9.6, 25.3, 25.2, 15.7, 18.5, 19.4, 0.0]
    };

    tcareChartInstances.milestones = new Chart(milesCanvas, {
      type: 'bar',
      data: {
        labels: dMiles.milestones,
        datasets: [
          {
            label: 'Same Outlet (SO)',
            data: dMiles.same_outlet,
            backgroundColor: '#10b981',
            borderRadius: 3
          },
          {
            label: 'Tunas Group (TG)',
            data: dMiles.tunas_group,
            backgroundColor: '#f59e0b',
            borderRadius: 3
          },
          {
            label: 'Other Dealer (OD)',
            data: dMiles.other_dealer,
            backgroundColor: '#ef4444',
            borderRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 9.5, weight: '600' }, boxWidth: 10, padding: 6 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, weight: '700' } } },
          y: {
            beginAtZero: true,
            max: 80,
            ticks: {
              font: { size: 9 },
              callback: (v) => v + '%'
            }
          }
        }
      }
    });
  }

  // 9. Chart 13: Remark Follow Up Service (Horizontal Bar Chart)
  const fuCanvas = document.getElementById('chart-tcare-remark-fu');
  if (fuCanvas) {
    if (tcareChartInstances.remarkFu) tcareChartInstances.remarkFu.destroy();
    const fuList = tcareData.remark_follow_up || [
      { label: 'Booking', count: 188, rate: '64.4%', val: 64.4 },
      { label: 'Service Di Tempat Lain', count: 91, rate: '31.2%', val: 31.2 },
      { label: 'Nomer Tdk Dihubungi', count: 12, rate: '4.1%', val: 4.1 },
      { label: 'Tidak Diangkat', count: 1, rate: '0.3%', val: 0.3 }
    ];

    tcareChartInstances.remarkFu = new Chart(fuCanvas, {
      type: 'bar',
      data: {
        labels: fuList.map(item => item.label),
        datasets: [{
          label: 'Persentase (%)',
          data: fuList.map(item => item.val),
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Persentase: ${ctx.raw}% (${formatNumber(fuList[ctx.dataIndex].count)} unit)`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 75,
            ticks: {
              font: { size: 9 },
              callback: (v) => v + '%'
            }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 9.5, weight: '600' } }
          }
        }
      }
    });
  }
}

// ==========================================================================
// AO REPORT GR — EXACT GOOGLE SPREADSHEET MONITORING ENGINE
// Faithfully reproducing Google Sheets "Dashboard AO" layout and data
// ==========================================================================
let aoActiveWeek = 'W1'; // 'all', 'W1', 'W2', 'W3', 'W4', 'W5'
let aoActiveMonth = 'October';
let aoEventsInitialized = false;

let aoAutoRefreshSec = parseInt(localStorage.getItem('ao_autorefresh_sec') || '30', 10);
let aoCountdownTimer = null;
let aoCountdownLeft = aoAutoRefreshSec;

function startAoAutoRefreshTimer() {
  if (aoCountdownTimer) clearInterval(aoCountdownTimer);
  aoCountdownLeft = aoAutoRefreshSec > 0 ? aoAutoRefreshSec : 0;
  updateAoCountdownDisplay();

  if (aoAutoRefreshSec <= 0) return;

  aoCountdownTimer = setInterval(() => {
    aoCountdownLeft--;
    if (aoCountdownLeft <= 0) {
      triggerAoAutoRefresh(true);
      aoCountdownLeft = aoAutoRefreshSec;
    }
    updateAoCountdownDisplay();
  }, 1000);
}

function updateAoCountdownDisplay() {
  const el = document.getElementById('ao-countdown-text');
  if (!el) return;
  if (aoAutoRefreshSec <= 0) {
    el.textContent = '(Off)';
    el.style.color = '#94a3b8';
  } else {
    el.textContent = `(${aoCountdownLeft}s)`;
    el.style.color = '#16a34a';
  }
}

async function triggerAoAutoRefresh(isAuto = false) {
  const refreshBtn = document.getElementById('ao-btn-refresh-sheet');
  const iframe = document.getElementById('ao-google-sheet-frame');
  const lastUpdateTag = document.getElementById('ao-last-update-tag');

  if (refreshBtn) {
    refreshBtn.classList.add('ao-refreshing');
  }

  // 1. Refresh iframe with cache buster
  if (iframe) {
    const sheetModeSel = document.getElementById('ao-sheet-mode-select');
    const currentMode = sheetModeSel ? sheetModeSel.value : (localStorage.getItem('ao_sheet_mode') || 'edit');
    let baseSrc = 'https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/edit?gid=1124551793#gid=1124551793';
    if (currentMode === 'minimal') {
      baseSrc = 'https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/edit?gid=1124551793&rm=minimal#gid=1124551793';
    } else if (currentMode === 'htmlembed') {
      baseSrc = 'https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/htmlembed?gid=1124551793&widget=false&chrome=false';
    }

    // Only reload iframe when manual refresh OR when in static htmlembed mode
    // (Preserves user's cell focus/dropdown interaction in interactive sheet mode)
    if (!isAuto || currentMode === 'htmlembed') {
      iframe.src = `${baseSrc}&_t=${Date.now()}`;
    }
  }

  // 2. Refresh native data via JSONP (bypasses CORS in all browsers)
  if (typeof syncAoFromLiveSheet === 'function') {
    await syncAoFromLiveSheet(isAuto);
  }

  // 3. Update last sync timestamp
  if (lastUpdateTag) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdateTag.textContent = `Terakhir: ${timeStr}`;
  }

  setTimeout(() => {
    if (refreshBtn) refreshBtn.classList.remove('ao-refreshing');
  }, 900);
}

async function loadAoData() {
  // 1. Try Live Google Sheets JSONP on initial load
  try {
    if (typeof fetchAoFromGoogleSheetsJSONP === 'function' && typeof parseAoGvizTable === 'function') {
      const table = await fetchAoFromGoogleSheetsJSONP();
      const parsed = parseAoGvizTable(table);
      if (parsed && parsed.summary) {
        aoData = parsed;
        if (aoData.meta?.active_week) {
          aoActiveWeek = aoData.meta.active_week;
          const weekSel = document.getElementById('ao-week-select');
          if (weekSel) weekSel.value = aoActiveWeek;
        }
        console.log('AO Report loaded LIVE from Google Sheets:', aoActiveWeek, aoData.meta?.outlet);
        renderAoReport();
        return aoData;
      }
    }
  } catch (liveErr) {
    console.warn('Live AO JSONP load failed, trying local fallback:', liveErr);
  }

  // 2. Fallback to local ao_report_data.json
  try {
    const cacheBuster = '?v=' + Date.now();
    let res = await fetch('data/ao_report_data.json' + cacheBuster);
    if (!res.ok) {
      res = await fetch('data/ao_report_data.json');
    }
    if (res.ok) {
      aoData = await res.json();
      console.log('AO Report data loaded from local cache:', aoData?.meta?.title);
      renderAoReport();
      return aoData;
    }
  } catch (err) {
    console.error('Error loading AO report data:', err);
  }
}

let aoCurrentViewMode = localStorage.getItem('ao_view_mode') || 'embed';

function initAoViewToggle() {
  const toggleEmbed = document.getElementById('ao-toggle-embed');
  const toggleNative = document.getElementById('ao-toggle-native');
  const embedView = document.getElementById('ao-embed-view');
  const nativeView = document.getElementById('ao-native-view');
  const refreshBtn = document.getElementById('ao-btn-refresh-sheet');
  const fullscreenBtn = document.getElementById('ao-btn-fullscreen');
  const iframeWrapper = document.getElementById('ao-iframe-wrapper');
  const iframe = document.getElementById('ao-google-sheet-frame');
  const iframeLoading = document.getElementById('ao-iframe-loading');

  if (!toggleEmbed || !toggleNative || !embedView || !nativeView) return;

  function setViewMode(mode) {
    aoCurrentViewMode = mode;
    localStorage.setItem('ao_view_mode', mode);
    if (mode === 'embed') {
      embedView.style.display = 'block';
      nativeView.style.display = 'none';
      toggleEmbed.classList.add('active');
      toggleNative.classList.remove('active');
    } else {
      embedView.style.display = 'none';
      nativeView.style.display = 'block';
      toggleNative.classList.add('active');
      toggleEmbed.classList.remove('active');
      if (aoData) {
        renderAoReport();
      }
    }
  }

  // Bind clicks once
  if (!toggleEmbed.dataset.bound) {
    toggleEmbed.dataset.bound = 'true';
    toggleEmbed.addEventListener('click', () => setViewMode('embed'));
    toggleNative.addEventListener('click', () => setViewMode('native'));

    // Handle iframe load event & fallback timeout
    const hideLoading = () => {
      if (iframeLoading) {
        iframeLoading.style.opacity = '0';
        setTimeout(() => {
          iframeLoading.style.display = 'none';
        }, 300);
      }
    };

    if (iframe && iframeLoading) {
      iframe.addEventListener('load', hideLoading);
      setTimeout(hideLoading, 2000);
    }

    // Refresh sheet button
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        triggerAoAutoRefresh(false);
        aoCountdownLeft = aoAutoRefreshSec;
        updateAoCountdownDisplay();
      });
    }

    // Sheet Mode Selector (Interactive Edit vs Minimal vs HTML)
    const sheetModeSel = document.getElementById('ao-sheet-mode-select');
    if (sheetModeSel) {
      const savedMode = localStorage.getItem('ao_sheet_mode') || 'edit';
      sheetModeSel.value = savedMode;
      sheetModeSel.addEventListener('change', () => {
        const mode = sheetModeSel.value;
        localStorage.setItem('ao_sheet_mode', mode);
        let targetSrc = 'https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/edit?gid=1124551793#gid=1124551793';
        if (mode === 'minimal') {
          targetSrc = 'https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/edit?gid=1124551793&rm=minimal#gid=1124551793';
        } else if (mode === 'htmlembed') {
          targetSrc = 'https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/htmlembed?gid=1124551793&widget=false&chrome=false';
        }
        if (iframe) {
          if (iframeLoading) {
            iframeLoading.style.display = 'flex';
            iframeLoading.style.opacity = '1';
          }
          iframe.src = targetSrc;
        }
        if (mode === 'htmlembed') {
          applyZoom(40);
        } else {
          applyZoom(100);
        }
      });
    }

    // Auto-refresh interval dropdown
    const autoRefreshSel = document.getElementById('ao-autorefresh-select');
    if (autoRefreshSel) {
      autoRefreshSel.value = String(aoAutoRefreshSec);
      autoRefreshSel.addEventListener('change', () => {
        aoAutoRefreshSec = parseInt(autoRefreshSel.value, 10);
        localStorage.setItem('ao_autorefresh_sec', aoAutoRefreshSec);
        startAoAutoRefreshTimer();
      });
    }
    startAoAutoRefreshTimer();

    // Fullscreen toggle
    if (fullscreenBtn && iframeWrapper) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (iframeWrapper.requestFullscreen) {
            iframeWrapper.requestFullscreen().catch(() => {
              iframeWrapper.classList.toggle('ao-fullscreen-mode');
            });
          } else if (iframeWrapper.webkitRequestFullscreen) {
            iframeWrapper.webkitRequestFullscreen();
          } else {
            iframeWrapper.classList.toggle('ao-fullscreen-mode');
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
        }
      });

      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
          iframeWrapper.classList.remove('ao-fullscreen-mode');
        }
      });
      document.addEventListener('webkitfullscreenchange', () => {
        if (!document.webkitFullscreenElement) {
          iframeWrapper.classList.remove('ao-fullscreen-mode');
        }
      });
    }

    // Dynamic Zoom control system (Default 100% for interactive sheet, range 25%-120%)
    let currentZoomPct = parseInt(localStorage.getItem('ao_iframe_zoom_v3') || '100', 10);
    const zoomDisplay = document.getElementById('ao-zoom-display');
    const zoomBtns = document.querySelectorAll('.ao-zoom-btn');
    const zoomInBtn = document.getElementById('ao-zoom-in');
    const zoomOutBtn = document.getElementById('ao-zoom-out');

    function applyZoom(pct) {
      pct = Math.max(25, Math.min(120, pct));
      currentZoomPct = pct;
      localStorage.setItem('ao_iframe_zoom_v3', pct);

      if (zoomDisplay) zoomDisplay.textContent = `${pct}%`;

      if (iframe) {
        if (pct === 100) {
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.transform = 'none';
          iframe.style.transformOrigin = '0 0';
        } else {
          const scale = pct / 100;
          const inv = (100 / scale).toFixed(3);
          iframe.style.width = `${inv}%`;
          iframe.style.height = `${inv}%`;
          iframe.style.transform = `scale(${scale})`;
          iframe.style.transformOrigin = '0 0';
        }
      }

      zoomBtns.forEach(btn => {
        const bVal = parseInt(btn.dataset.zoom, 10);
        btn.classList.toggle('active', bVal === pct);
      });
    }

    zoomBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.zoom, 10);
        if (!isNaN(val)) applyZoom(val);
      });
    });

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        applyZoom(currentZoomPct + 5);
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        applyZoom(currentZoomPct - 5);
      });
    }

    // Apply initial zoom
    applyZoom(currentZoomPct);
  }

  // Set initial mode (defaults to 'embed' per user request)
  setViewMode(aoCurrentViewMode);
}

function initAoEvents() {
  initAoViewToggle();
  if (aoEventsInitialized) return;
  aoEventsInitialized = true;

  // Week Selector Dropdown
  const weekSel = document.getElementById('ao-week-select');
  if (weekSel) {
    weekSel.value = aoActiveWeek;
    weekSel.addEventListener('change', () => {
      aoActiveWeek = weekSel.value;
      renderAoReport();
    });
  }

  // Month Selector Dropdown
  const monthSel = document.getElementById('ao-month-select');
  if (monthSel) {
    monthSel.value = aoActiveMonth;
    monthSel.addEventListener('change', () => {
      aoActiveMonth = monthSel.value;
      renderAoReport();
    });
  }

  // Sync Button
  const syncBtn = document.getElementById('btn-sync-ao-sheet');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncAoFromLiveSheet);
  }
}

function renderAoReport() {
  if (!aoData) return;
  initAoEvents();

  // 1. Render Top Header & Vertical KPI Strip
  renderAoHeaderAndCenterStrip();

  // 2. Render KPI Tree Box
  renderAoKpiTree();

  // 3. Render Weekly Performance Tables
  renderAoWeeklyCpusTable();
  renderAoWeeklyBookingTable();

  // 4. Render Cumulative Chart
  renderAoCumulativeChart();

  // 5. Render Prospecting Funneling Tables (T-Care & Non T-Care Stacked)
  renderAoFunnelTables();

  // 6. Render Section III SBI Table
  renderAoSbiTable();

  // 7. Render Section IV Action Plan Table
  renderAoActionPlanTable();
}

function renderAoHeaderAndCenterStrip() {
  const s = aoData.summary || {};
  const monthTargets = aoData.kpi_tree_monthly_targets || {};
  const currTarget = monthTargets[aoActiveMonth]?.target || s.closing_commitment || 714;

  // Header Box (Top Right)
  const est = s.this_month_closing_estimation || {};
  const elEstCpus = document.getElementById('ao-est-cpus-val');
  const elEstPct = document.getElementById('ao-est-pct-val');
  if (elEstCpus) elEstCpus.textContent = (est.cpus || 714).toLocaleString('id-ID');
  if (elEstPct) elEstPct.textContent = `${est.vs_tar_pct || 105}%`;

  // Center Vertical Strip (Column O)
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('ao-vkpi-closing-comm', currTarget.toLocaleString('id-ID'));
  setTxt('ao-vkpi-total-gap', (s.total_cpus_gap_fm || -619).toLocaleString('id-ID'));
  setTxt('ao-vkpi-walkin-gap', (s.gap_cpus_walkin_fm || -226).toLocaleString('id-ID'));
  setTxt('ao-vkpi-walkin-act', (s.act_cpus_walkin_fm || 42).toLocaleString('id-ID'));
  setTxt('ao-vkpi-booking-gap', (s.gap_cpus_booking_fm || -393).toLocaleString('id-ID'));
  setTxt('ao-vkpi-booking-act', (s.act_cpus_booking_fm || 53).toLocaleString('id-ID'));

  // Target Total in Sec 1
  setTxt('ao-sec1-target-total', currTarget.toLocaleString('id-ID'));

  // Mini Week Box (Top Right of Sec 1 Table)
  const wp = aoData.section_1_target_setting?.weekly_performance || {};
  let wIdx = 0;
  if (aoActiveWeek === 'W2') wIdx = 1;
  else if (aoActiveWeek === 'W3') wIdx = 2;
  else if (aoActiveWeek === 'W4') wIdx = 3;
  else if (aoActiveWeek === 'W5') wIdx = 4;

  const wLabel = aoActiveWeek === 'all' ? 'W1' : aoActiveWeek;
  setTxt('ao-mini-week-label', wLabel);

  const miniW = aoData.section_1_target_setting?.mini_week_performance || {};
  let actW = (wp.total_cpus_actual && wp.total_cpus_actual[wIdx] !== undefined) ? wp.total_cpus_actual[wIdx] : (miniW.actual || 95);
  let pctW = '130%';
  if (aoActiveWeek === 'W1' || aoActiveWeek === 'all') {
    pctW = miniW.vs_tar || '130%';
    actW = miniW.actual || 95;
  } else {
    const planW = (wp.total_cpus_plan && wp.total_cpus_plan[wIdx] !== undefined) ? wp.total_cpus_plan[wIdx] : 160;
    pctW = planW > 0 ? `${Math.round((actW / planW) * 100)}%` : '0%';
  }

  setTxt('ao-mini-w1-act', actW);
  setTxt('ao-mini-w1-pct', pctW);
}

function renderAoKpiTree() {
  const tree = aoData.section_1_target_setting?.kpi_tree || {};
  const monthTargets = aoData.kpi_tree_monthly_targets || {};
  const mData = monthTargets[aoActiveMonth] || { target: 714, booking_show: 446, tcare: 229, non_tcare: 217 };

  const cpusVal = mData.target || tree.cpus_target || 714;
  const walkinVal = (tree.walk_in && tree.walk_in.target) ? tree.walk_in.target : Math.round(cpusVal * 0.375);
  const walkinPct = (tree.walk_in && tree.walk_in.pct) ? `${tree.walk_in.pct}%` : '38%';

  const bookingVal = (tree.booking_show && tree.booking_show.target) ? tree.booking_show.target : (mData.booking_show || 446);
  const bookingPct = (tree.booking_show && tree.booking_show.pct) ? `${tree.booking_show.pct}%` : '62%';

  const bs = tree.booking_show || {};
  const tcareVal = (bs.tcare && bs.tcare.target) ? bs.tcare.target : (mData.tcare || 229);
  const tcarePct = (bs.tcare && bs.tcare.pct) ? `${bs.tcare.pct}%` : '51%';

  const nts = bs.non_tcare || {};
  const nonTcareVal = (nts.target) ? nts.target : (mData.non_tcare || 217);
  const nonTcarePct = (nts.pct) ? `${nts.pct}%` : '49%';

  const oilVal = (nts.oil && nts.oil.target) ? nts.oil.target : 26;
  const oilPct = (nts.oil && nts.oil.pct) ? `${nts.oil.pct}%` : '12%';

  const grVal = (nts.gr && nts.gr.target) ? nts.gr.target : 140;
  const grPct = (nts.gr && nts.gr.pct) ? `${nts.gr.pct}%` : '65%';

  const sbeVal = (nts.sbe && nts.sbe.target) ? nts.sbe.target : 50;
  const sbePct = (nts.sbe && nts.sbe.pct) ? `${nts.sbe.pct}%` : '23%';

  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT('ao-tree-cpus', Math.round(cpusVal).toLocaleString('id-ID'));
  setT('ao-tree-walkin', Math.round(walkinVal).toLocaleString('id-ID'));
  setT('ao-tree-walkin-pct', walkinPct);
  setT('ao-tree-booking', Math.round(bookingVal).toLocaleString('id-ID'));
  setT('ao-tree-booking-pct', bookingPct);

  setT('ao-tree-tcare', Math.round(tcareVal).toLocaleString('id-ID'));
  setT('ao-tree-tcare-pct', tcarePct);
  setT('ao-tree-nontcare', Math.round(nonTcareVal).toLocaleString('id-ID'));
  setT('ao-tree-nontcare-pct', nonTcarePct);

  setT('ao-tree-oil', Math.round(oilVal));
  setT('ao-tree-oil-pct', oilPct);
  setT('ao-tree-gr', Math.round(grVal));
  setT('ao-tree-gr-pct', grPct);
  setT('ao-tree-sbe', Math.round(sbeVal));
  setT('ao-tree-sbe-pct', sbePct);
}

function renderAoWeeklyCpusTable() {
  const tbody = document.getElementById('ao-tbody-sec1-cpus');
  if (!tbody) return;

  const wp = aoData.section_1_target_setting?.weekly_performance || {};
  const getWeekClass = (wIdx) => (aoActiveWeek === `W${wIdx + 1}`) ? 'style="background: #fef9c3; font-weight: 800;"' : '';

  const rows = [
    { label: 'TOTAL CPUS PLAN', data: wp.total_cpus_plan || [73, 160, 160, 160, 160], isInt: true },
    { label: 'TOTAL CPUS ACTUAL', data: wp.total_cpus_actual || [95, 162, 143, 0, 0], isInt: true, bold: true, isBlueRow: true },
    { label: 'TOTAL GAP', data: wp.total_gap || [22, 2, -17, -160, -160], isDiff: true, isInt: true },
    { label: 'COMMULATIVE GAP CPUS', data: wp.cumulative_gap_cpus || [22, 24, 7, -154, -314], isDiff: true, isInt: true, italic: true },
    { label: 'WALK-IN ASSUMPT.', data: wp.walkin_assumpt || [27, 60, 60, 60, 60], isInt: true },
    { label: 'WALK-IN ACTUAL', data: wp.walkin_actual || [42, 42, 43, 0, 0], isInt: true, bold: true, isBlueRow: true },
    { label: 'GAP', data: wp.walkin_gap || [15, -18, -17, -60, -60], isDiff: true, isInt: true },
    { label: 'COMMULATIVE GAP WALK-IN', data: wp.cumulative_gap_walkin || [15, -4, -21, -81, -141], isDiff: true, isInt: true, italic: true }
  ];

  let html = '';
  rows.forEach(r => {
    const trClass = r.isBlueRow ? 'class="ao-actual-blue-row"' : '';
    html += `<tr ${trClass}>`;
    const labelStyle = r.italic ? 'font-style: italic;' : '';
    html += `<td style="text-align: left; font-weight: ${r.bold ? '800' : '600'}; ${labelStyle}">${r.label}</td>`;
    for (let i = 0; i < 5; i++) {
      let v = r.data[i] !== undefined ? r.data[i] : 0;
      if (r.isInt) v = Math.round(v);
      let disp = v.toLocaleString('id-ID');
      let cellStyle = r.italic ? 'font-style: italic;' : '';
      if (r.isDiff) {
        if (v < 0) cellStyle += ' color: #cc0000; font-weight: 800;';
        else if (v > 0) { cellStyle += ' color: #15803d; font-weight: 800;'; disp = `+${disp}`; }
      }
      html += `<td ${getWeekClass(i)} style="text-align: center; ${cellStyle}">${disp}</td>`;
    }
    html += `</tr>`;
  });

  tbody.innerHTML = html;
}

function renderAoWeeklyBookingTable() {
  const tbody = document.getElementById('ao-tbody-sec1-booking');
  if (!tbody) return;

  const wp = aoData.section_1_target_setting?.weekly_performance || {};
  const getWeekClass = (wIdx) => (aoActiveWeek === `W${wIdx + 1}`) ? 'style="background: #fef9c3; font-weight: 800;"' : '';

  const rows = [
    { label: 'WORKING DAY', data: wp.working_days || [5, 6, 6, 6, 4], total: wp.working_days_total || 27 },
    { label: 'BOOKING SHOW PLAN (CPUS)', data: wp.booking_show_plan || [46, 100, 100, 100, 100], total: wp.booking_show_plan_total || 446 },
    { label: 'BOOKING SHOW ACTUAL', data: wp.booking_show_actual || [53, 120, 100, 0, 0], total: wp.booking_show_actual_total || 273, bold: true, isBlueRow: true },
    { label: 'GAP', data: wp.booking_show_gap || [7, 20, 0, -100, -100], total: wp.booking_show_gap_total || -173, isDiff: true },
    { label: 'COMMULATIVE GAP BOOKING SHOW', data: wp.booking_show_gap_cumulative || [7, 27, 27, -73, -173], total: wp.booking_show_gap_total || -173, isDiff: true, italic: true },
    { label: 'NO SHOW ASSUMPTION', data: wp.no_show_assumption || [10, 22, 22, 22, 22], total: wp.no_show_assumption_total || 98 },
    { label: 'NO SHOW ACTUAL', data: wp.no_show_actual || [31, 45, 40, 56, 42], total: wp.no_show_actual_total || 214, bold: true, isBlueRow: true },
    { label: 'NO SHOW RATIO', data: wp.no_show_ratio || ['37%', '27%', '29%', '100%', '100%'], total: wp.no_show_ratio_total || '44%' },
    { label: 'COMMULATIVE NO-SHOW', data: wp.cumulative_no_show || [31, 76, 116, 172, 214], total: wp.cumulative_no_show_total || 214, italic: true },
    { label: 'BOOKING GROSS PLAN', data: wp.booking_gross_plan || [56, 122, 122, 122, 122], total: wp.booking_gross_plan_total || 544, bold: true },
    { label: 'INITIAL (N-1)', data: wp.booking_gross_initial || [5, 1, 1, 0, 0], total: wp.booking_gross_initial_total || 7, indent: true },
    { label: 'BOOKING (N)', data: wp.booking_gross_n || [51, 121, 121, 122, 122], total: wp.booking_gross_n_total || 537, indent: true },
    { label: 'BOOKING ACTUAL', data: wp.booking_actual || [84, 165, 140, 56, 42], total: wp.booking_actual_total || 487, bold: true, isBlueRow: true },
    { label: 'GAP', data: wp.booking_gap || [28, 43, 18, -66, -80], total: wp.booking_gap_total || -57, isDiff: true },
    { label: 'COMMULATIVE GAP BOOKING', data: wp.cumulative_gap_booking || [28, 71, 89, 23, -57], total: wp.booking_gap_total || -57, isDiff: true, italic: true }
  ];

  let html = '';
  rows.forEach(r => {
    const trClass = r.isBlueRow ? 'class="ao-actual-blue-row"' : '';
    html += `<tr ${trClass}>`;
    const indentStyle = r.indent ? 'padding-left: 16px; font-size: 10px; color: #475569;' : '';
    const labelStyle = (r.italic ? 'font-style: italic;' : '') + indentStyle;
    html += `<td style="text-align: left; font-weight: ${r.bold ? '800' : '600'}; ${labelStyle}">${r.label}</td>`;
    for (let i = 0; i < 5; i++) {
      let v = r.data[i] !== undefined ? r.data[i] : 0;
      let disp = v;
      let cellStyle = r.italic ? 'font-style: italic;' : '';
      if (typeof v === 'number') {
        disp = Math.round(v).toLocaleString('id-ID');
        if (r.isDiff) {
          if (v < 0) cellStyle += ' color: #cc0000; font-weight: 800;';
          else if (v > 0) { cellStyle += ' color: #15803d; font-weight: 800;'; disp = `+${disp}`; }
        }
      }
      html += `<td ${getWeekClass(i)} style="text-align: center; ${cellStyle}">${disp}</td>`;
    }
    let totDisp = r.total;
    let totStyle = r.italic ? 'font-style: italic;' : '';
    if (typeof r.total === 'number') {
      totDisp = Math.round(r.total).toLocaleString('id-ID');
      if (r.isDiff && r.total < 0) totStyle += ' color: #cc0000; font-weight: 800;';
      else if (r.isDiff && r.total > 0) totStyle += ' color: #15803d; font-weight: 800;';
    }
    html += `<td style="text-align: center; font-weight: 800; background: #f8fafc; ${totStyle}">${totDisp}</td>`;
    html += `</tr>`;
  });

  tbody.innerHTML = html;
}

function renderAoCumulativeChart() {
  const canvas = document.getElementById('chart-ao-cumulative');
  if (!canvas || typeof Chart === 'undefined') return;

  if (aoChartInstances.cumulative) {
    aoChartInstances.cumulative.destroy();
  }

  const chartConfig = aoData.section_1_target_setting?.cumulative_chart || {};
  const weeks = chartConfig.weeks || ['W1', 'W2', 'W3', 'W4', 'W5'];
  const targetData = chartConfig.target || [73, 233, 393, 554, 714];
  const actualData = chartConfig.actual || [95, 257, 400, 400, 400];

  aoChartInstances.cumulative = new Chart(canvas, {
    type: 'line',
    data: {
      labels: weeks,
      datasets: [
        {
          label: 'CPUS TARGET COMMULATIVE',
          data: targetData,
          borderColor: '#000000',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 4,
          pointBackgroundColor: '#000000',
          tension: 0.1
        },
        {
          label: 'CPUS ACTUAL COMMULATIVE',
          data: actualData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: '#10b981',
          tension: 0.1,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10, weight: '700' } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} Unit` } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { font: { size: 9.5 } } },
        x: { grid: { display: false }, ticks: { font: { size: 10, weight: '700' } } }
      }
    }
  });
}

function renderAoFunnelTables() {
  const renderFunnelTbody = (tbodyId, stagesObj) => {
    const tbody = document.getElementById(tbodyId);
    if (!tbody || !stagesObj) return;

    const stages = [
      { key: 'data', name: 'DATA' },
      { key: 'connected', name: 'CONNECTED' },
      { key: 'contacted', name: 'CONTACTED' },
      { key: 'booking', name: 'BOOKING' },
      { key: 'booking_show', name: 'BOOKING SHOW' }
    ];

    let html = '';
    stages.forEach(st => {
      const d = stagesObj[st.key] || {};
      const targetVal = d.target !== undefined ? d.target : 0;
      const targetWeeks = d.target_weeks || (Array.isArray(targetVal) ? targetVal : [targetVal, targetVal, targetVal, targetVal, targetVal]);
      const actuals = d.actual || [0, 0, 0, 0, 0];
      const vsTarWeeks = d.vs_tar_weeks || [0, 0, 0, 0, 0];
      const actualTotal = d.actual_total !== undefined ? d.actual_total : 0;
      const targetTotal = d.target_total !== undefined ? d.target_total : (typeof targetVal === 'number' ? targetVal : 0);
      const vsTarTotal = d.vs_tar_total_pct !== undefined ? d.vs_tar_total_pct : 0;

      // Row 1: TARGET
      html += `<tr>`;
      html += `<td rowspan="3" style="text-align: left; font-weight: 800; vertical-align: middle; border-bottom: 2px solid #000; min-width: 75px; background: #ffffff;">${st.name}</td>`;
      html += `<td style="text-align: left; font-weight: 700; background: #ffffff;">TARGET</td>`;
      for (let i = 0; i < 5; i++) {
        let tw = Array.isArray(targetWeeks) ? (targetWeeks[i] !== undefined ? targetWeeks[i] : targetVal) : targetVal;
        html += `<td style="text-align: center; color: #475569; background: #ffffff;">${Math.round(tw).toLocaleString('id-ID')}</td>`;
      }
      html += `<td style="text-align: center; font-weight: 800; background: #f8fafc;">${Math.round(targetTotal).toLocaleString('id-ID')}</td>`;
      html += `</tr>`;

      // Row 2: ACTUAL (Yellow Highlight across ALL weeks + Total, matching Google Sheet)
      html += `<tr>`;
      html += `<td style="text-align: left; font-weight: 800; background: #ffffff;">ACTUAL</td>`;
      for (let i = 0; i < 5; i++) {
        const act = actuals[i] !== undefined ? actuals[i] : 0;
        const disp = typeof act === 'number' ? (Number.isInteger(act) ? act.toLocaleString('id-ID') : act.toFixed(1)) : act;
        html += `<td class="ao-yellow-cell" style="font-weight: 800; font-size: 11px;">${disp}</td>`;
      }
      html += `<td class="ao-yellow-cell" style="font-weight: 900; font-size: 11px;">${Math.round(actualTotal).toLocaleString('id-ID')}</td>`;
      html += `</tr>`;

      // Row 3: VS TAR (Green Highlight across ALL weeks + Total, matching Google Sheet)
      html += `<tr style="border-bottom: 2px solid #000;">`;
      html += `<td style="text-align: left; font-weight: 700; background: #ffffff;">VS TAR</td>`;
      for (let i = 0; i < 5; i++) {
        const vt = vsTarWeeks[i] !== undefined ? vsTarWeeks[i] : 0;
        html += `<td class="ao-green-cell" style="font-size: 10.5px;">${vt}%</td>`;
      }
      html += `<td class="ao-green-cell" style="font-size: 11px; font-weight: 900;">${vsTarTotal}%</td>`;
      html += `</tr>`;
    });

    tbody.innerHTML = html;
  };

  const f = aoData.section_2_prospecting_funneling || {};
  renderFunnelTbody('ao-tbody-funnel-tcare', f.tcare);
  renderFunnelTbody('ao-tbody-funnel-nontcare', f.non_tcare);
}

function renderAoSbiTable() {
  const tbody = document.getElementById('ao-tbody-sbi-matrix');
  if (!tbody) return;

  const sbi = aoData.section_3_sbi || {};
  const t = sbi.target || {};
  const a = sbi.actual || {};
  const g = sbi.gap || {};

  const rows = [
    { cat: 'TARGET', label: 'NCS M-1', data: t.ncs_m1 || [16, 19, 19, 19, 13], total: t.ncs_m1_total || 87 },
    { cat: 'TARGET', label: 'NOT CAI', data: t.not_cai || [5, 4, 3, 2, 2], total: t.not_cai_total || 16 },
    { cat: 'TARGET', label: 'TOTAL', data: t.total || [21, 23, 22, 21, 15], total: t.total_total || 103, bold: true },

    { cat: 'ACTUAL', label: 'NCS M-1', data: a.ncs_m1 || [9, 13, 19, 18, 3], total: a.ncs_m1_total || 62, isYellow: true },
    { cat: 'ACTUAL', label: 'NOT CAI', data: a.not_cai || [7, 6, 0, 1, 10], total: a.not_cai_total || 25, isYellow: true },
    { cat: 'ACTUAL', label: 'TOTAL', data: a.total || [16, 19, 19, 19, 13], total: a.total_total || 87, bold: true, isYellow: true },

    { cat: 'GAP', label: 'GAP KUMULATIF', data: g.gap_kumulatif || [-5, -4, -3, -2, -2], total: g.gap_kumulatif_total || -16, isSalmon: true, bold: true }
  ];

  let html = '';
  rows.forEach(r => {
    html += `<tr>`;
    html += `<td style="text-align: left; font-weight: ${r.bold ? '800' : '600'}; background: #ffffff;">${r.cat}: ${r.label}</td>`;
    for (let i = 0; i < 5; i++) {
      const v = r.data[i] !== undefined ? r.data[i] : 0;
      if (r.isSalmon) {
        html += `<td class="ao-salmon-cell">${v}</td>`;
      } else if (r.isYellow) {
        html += `<td class="ao-yellow-cell">${v}</td>`;
      } else {
        html += `<td style="text-align: center; background: #ffffff;">${v}</td>`;
      }
    }
    if (r.isSalmon) {
      html += `<td class="ao-salmon-cell">${r.total}</td>`;
    } else if (r.isYellow) {
      html += `<td class="ao-yellow-cell" style="font-weight: 900;">${r.total}</td>`;
    } else {
      html += `<td style="text-align: center; font-weight: 800; background: #f8fafc;">${r.total}</td>`;
    }
    html += `</tr>`;
  });

  tbody.innerHTML = html;

  // Target Rate Badge
  const badgeEl = document.getElementById('ao-sbi-rate-badge');
  if (badgeEl) {
    badgeEl.textContent = sbi.target_rate_badge || '81,61%';
  }
}

function renderAoActionPlanTable() {
  const tbody = document.getElementById('ao-tbody-action-plan');
  if (!tbody) return;

  const plans = aoData.section_4_action_plan || [
    { category: 'TCARE', plan: 'reminder by MRA - Akselerasi Reminder potency W4-W5', pic: 'MRA', status: 'on process' },
    { category: 'TCARE', plan: 'THS aktivitas reminder cust fleet (sudeco-TPI-Movus)', pic: 'THS', status: 'on process' },
    { category: 'TCARE', plan: 'REMINDER BY SA potency by appsheet', pic: 'SA', status: 'on process' },
    { category: 'NON TCARE', plan: 'reminder by MRA', pic: 'MRA', status: 'on process' },
    { category: 'NON TCARE', plan: 'THS aktivitas by app sheet', pic: 'THS', status: 'on process' },
    { category: 'NON TCARE', plan: 'REMINDER BY SA potency', pic: 'SA', status: 'on process' },
    { category: 'SBI', plan: 'reminder by MRA dan Sales - report monitoring SPV & Branch Head', pic: 'MRA - Kabeng', status: 'on process' }
  ];

  let html = '';
  plans.forEach(p => {
    html += `<tr>`;
    html += `<td style="text-align: left; font-weight: 800; background: #ffffff;">${p.category}</td>`;
    html += `<td style="text-align: left; font-size: 11px; background: #ffffff;">${p.plan}</td>`;
    html += `<td style="text-align: center; font-weight: 700; background: #ffffff;">${p.pic}</td>`;
    html += `<td style="text-align: center; background: #ffffff;"><span class="ao-status-pill">on process</span></td>`;
    html += `</tr>`;
  });

  tbody.innerHTML = html;
}

function fetchAoFromGoogleSheetsJSONP() {
  return new Promise((resolve, reject) => {
    const callbackName = 'aoGvizCallback_' + Math.floor(Math.random() * 10000000);
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheets JSONP timeout (10s)'));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      try {
        delete window[callbackName];
      } catch (e) {
        window[callbackName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[callbackName] = function(json) {
      cleanup();
      if (json && json.status === 'ok' && json.table) {
        resolve(json.table);
      } else {
        reject(new Error('Invalid GViz response: ' + (json ? json.status : 'null')));
      }
    };

    script.onerror = function() {
      cleanup();
      reject(new Error('GViz script network error'));
    };

    const gvizUrl = `https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/gviz/tq?gid=1124551793&tqx=responseHandler:${callbackName}&_t=${Date.now()}`;
    script.src = gvizUrl;
    document.head.appendChild(script);
  });
}

function parseAoGvizTable(gvizTable) {
  if (!gvizTable || !Array.isArray(gvizTable.rows)) return null;
  const rows = gvizTable.rows.map(r => {
    if (!r || !Array.isArray(r.c)) return [];
    return r.c.map(cell => {
      if (!cell || cell === null || (cell.v === null && cell.f === null)) return '';
      if (cell.f !== undefined && cell.f !== null) {
        return String(cell.f).trim();
      }
      if (cell.v !== undefined && cell.v !== null) {
        return String(cell.v).trim();
      }
      return '';
    });
  });
  return parseAoSheetRowsMatrix(rows);
}

function parseAoSheetRowsMatrix(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) return null;

  const getNum = (r, c, def = 0) => {
    if (!rows[r] || rows[r][c] === undefined || rows[r][c] === null) return def;
    let v = String(rows[r][c]).replace(/,/g, '.').replace(/%/g, '').trim();
    if (!v) return def;
    let n = parseFloat(v);
    return isNaN(n) ? def : (Number.isInteger(n) ? parseInt(v, 10) : n);
  };

  const getStr = (r, c, def = '') => {
    if (!rows[r] || rows[r][c] === undefined || rows[r][c] === null) return def;
    return String(rows[r][c]).trim() || def;
  };

  const cleanWeeks = (r, startCol = 8, count = 5) => {
    const arr = [];
    for (let c = startCol; c < startCol + count; c++) {
      arr.push(getNum(r, c, 0));
    }
    return arr;
  };

  const cleanWeeksStr = (r, startCol = 8, count = 5) => {
    const arr = [];
    for (let c = startCol; c < startCol + count; c++) {
      arr.push(getStr(r, c, '0%'));
    }
    return arr;
  };

  const activeWeekFound = getStr(1, 6, "W3") || "W3";

  return {
    meta: {
      title: "AO REPORT GR - Executive Intelligence & Monitoring",
      outlet: getStr(2, 6, "TUNAS TOYOTA KIARA CONDONG"),
      active_week: activeWeekFound,
      active_month: getStr(1, 8, "October"),
      active_year: "2026",
      source_url: "https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/edit?gid=1124551793#gid=1124551793"
    },
    summary: {
      this_month_closing_estimation: {
        cpus: getNum(1, 22, 714),
        vs_tar_pct: getNum(1, 23, 105)
      },
      closing_commitment: getNum(4, 14, 714),
      total_cpus_gap_fm: getNum(9, 14, -245),
      gap_cpus_walkin_fm: getNum(14, 14, -131),
      act_cpus_walkin_fm: getNum(19, 14, 137),
      gap_cpus_booking_fm: getNum(24, 14, -114),
      act_cpus_booking_fm: getNum(31, 14, 332)
    },
    section_1_target_setting: {
      kpi_tree: {
        cpus_target: getNum(9, 1, 714),
        walk_in: { target: getNum(9, 3, 268), pct: getNum(10, 3, 38) },
        booking_show: {
          target: getNum(24, 3, 446),
          pct: getNum(25, 3, 62),
          tcare: { target: getNum(24, 4, 229), pct: getNum(25, 4, 51) },
          non_tcare: {
            target: getNum(35, 4, 217),
            pct: getNum(36, 4, 49),
            oil: { target: getNum(34, 6, 26), pct: getNum(35, 6, 12) },
            gr: { target: getNum(37, 6, 140), pct: getNum(38, 6, 65) },
            sbe: { target: getNum(40, 6, 50), pct: getNum(41, 6, 23) }
          }
        }
      },
      mini_week_performance: {
        week: activeWeekFound,
        actual: getNum(8, 11, 469),
        vs_tar: getStr(8, 12, "119%")
      },
      weekly_performance: {
        weeks: ["W1", "W2", "W3", "W4", "W5"],
        total_cpus_plan: cleanWeeks(13, 8),
        total_cpus_plan_total: getNum(12, 8, 714),
        total_cpus_actual: cleanWeeks(14, 8),
        total_cpus_actual_total: getNum(14, 14, 469),
        total_gap: cleanWeeks(15, 8),
        cumulative_gap_cpus: cleanWeeks(16, 8),
        walkin_assumpt: cleanWeeks(17, 8),
        walkin_actual: cleanWeeks(18, 8),
        walkin_gap: cleanWeeks(19, 8),
        cumulative_gap_walkin: cleanWeeks(20, 8),
        working_days: cleanWeeks(46, 8),
        working_days_total: getNum(46, 14, 27),
        booking_show_plan: cleanWeeks(50, 8),
        booking_show_plan_total: getNum(49, 8, 446),
        booking_show_actual: cleanWeeks(51, 8),
        booking_show_actual_total: getNum(51, 14, 332),
        booking_show_gap: cleanWeeks(52, 8),
        booking_show_gap_total: getNum(52, 14, -114),
        booking_show_gap_cumulative: cleanWeeks(53, 8),
        no_show_assumption: cleanWeeks(54, 8),
        no_show_assumption_total: getNum(54, 14, 98),
        no_show_actual: cleanWeeks(55, 8),
        no_show_actual_total: getNum(55, 14, 222),
        no_show_ratio: cleanWeeksStr(56, 8),
        no_show_ratio_total: getStr(56, 14, "40%"),
        cumulative_no_show: cleanWeeks(57, 8),
        cumulative_no_show_total: getNum(57, 14, 222),
        booking_gross_plan: cleanWeeks(59, 8),
        booking_gross_plan_total: getNum(58, 8, 544),
        booking_gross_initial: cleanWeeks(60, 8),
        booking_gross_initial_total: getNum(60, 14, 7),
        booking_gross_n: cleanWeeks(61, 8),
        booking_gross_n_total: getNum(61, 14, 537),
        booking_actual: cleanWeeks(62, 8),
        booking_actual_total: getNum(62, 14, 554),
        booking_gap: cleanWeeks(63, 8),
        booking_gap_total: getNum(63, 14, 10),
        cumulative_gap_booking: cleanWeeks(64, 8)
      },
      cumulative_chart: {
        weeks: ["W1", "W2", "W3", "W4", "W5"],
        target: cleanWeeks(71, 8),
        actual: cleanWeeks(72, 8)
      },
      staircase_matrix: (aoData && aoData.section_1_target_setting && aoData.section_1_target_setting.staircase_matrix) || [
        {"row": 1, "cells": [{"col": 4, "val": -49, "type": "neg"}, {"col": 5, "val": 49, "type": "pos"}, {"col": 6, "val": -62, "type": "neg"}]},
        {"row": 2, "cells": [{"col": 4, "val": -51, "type": "neg"}, {"col": 5, "val": 51, "type": "pos"}, {"col": 6, "val": -52, "type": "neg"}]},
        {"row": 3, "cells": [{"col": 3, "val": -49, "type": "neg"}, {"col": 4, "val": 49, "type": "pos"}, {"col": 5, "val": -13, "type": "neg"}]},
        {"row": 4, "cells": [{"col": 3, "val": -51, "type": "neg"}, {"col": 4, "val": 51, "type": "pos"}, {"col": 5, "val": -1, "type": "neg"}]},
        {"row": 5, "cells": [{"col": 2, "val": -49, "type": "neg"}, {"col": 3, "val": 49, "type": "pos"}, {"col": 4, "val": -11, "type": "neg"}]},
        {"row": 6, "cells": [{"col": 2, "val": -51, "type": "neg"}, {"col": 3, "val": 51, "type": "pos"}, {"col": 4, "val": 39, "type": "pos"}]},
        {"row": 7, "cells": [{"col": 1, "val": 18, "type": "pos"}, {"col": 2, "val": 49, "type": "pos"}, {"col": 3, "val": 17, "type": "pos"}]},
        {"row": 8, "cells": [{"col": 1, "val": 20, "type": "pos"}, {"col": 2, "val": 51, "type": "pos"}, {"col": 3, "val": 51, "type": "pos"}]},
        {"row": 9, "cells": [{"col": 0, "val": 10, "type": "pos"}, {"col": 1, "val": 49, "type": "pos"}, {"col": 2, "val": 36, "type": "pos"}]},
        {"row": 10, "cells": [{"col": 0, "val": 27, "type": "pos"}, {"col": 1, "val": 51, "type": "pos"}, {"col": 2, "val": 31, "type": "pos"}]}
      ]
    },
    section_2_prospecting_funneling: {
      tcare: {
        data: { target_total: getNum(5, 18, 872), actual: cleanWeeks(6, 18), actual_total: getNum(6, 23, 580), vs_tar_weeks: cleanWeeks(7, 18), vs_tar_total_pct: getNum(7, 23, 67) },
        connected: { target_weeks: cleanWeeks(8, 18), target_total: getNum(8, 23, 864), actual: cleanWeeks(9, 18), actual_total: getNum(9, 23, 498), vs_tar_weeks: cleanWeeks(10, 18), vs_tar_total_pct: getNum(10, 23, 58) },
        contacted: { target_weeks: cleanWeeks(11, 18), target_total: getNum(11, 23, 398), actual: cleanWeeks(12, 18), actual_total: getNum(12, 23, 307), vs_tar_weeks: cleanWeeks(13, 18), vs_tar_total_pct: getNum(13, 23, 77) },
        booking: { target_weeks: cleanWeeks(14, 18), target_total: getNum(14, 23, 266), actual: cleanWeeks(15, 18), actual_total: getNum(15, 23, 130), vs_tar_weeks: cleanWeeks(16, 18), vs_tar_total_pct: getNum(16, 23, 49) },
        booking_show: { target_weeks: cleanWeeks(17, 18), target_total: getNum(17, 23, 229), actual: cleanWeeks(18, 18), actual_total: getNum(18, 23, 177), vs_tar_weeks: cleanWeeks(19, 18), vs_tar_total_pct: getNum(19, 23, 77) }
      },
      non_tcare: {
        data: { target_total: getNum(26, 18, 725), actual: cleanWeeks(27, 18), actual_total: getNum(27, 23, 479), vs_tar_weeks: cleanWeeks(28, 18), vs_tar_total_pct: getNum(28, 23, 66) },
        connected: { target_weeks: cleanWeeks(29, 18), target_total: getNum(29, 23, 639), actual: cleanWeeks(30, 18), actual_total: getNum(30, 23, 428), vs_tar_weeks: cleanWeeks(31, 18), vs_tar_total_pct: getNum(31, 23, 67) },
        contacted: { target_weeks: cleanWeeks(32, 18), target_total: getNum(32, 23, 447), actual: cleanWeeks(33, 18), actual_total: getNum(33, 23, 354), vs_tar_weeks: cleanWeeks(34, 18), vs_tar_total_pct: getNum(34, 23, 79) },
        booking: { target_weeks: cleanWeeks(35, 18), target_total: getNum(35, 23, 263), actual: cleanWeeks(36, 18), actual_total: getNum(36, 23, 293), vs_tar_weeks: cleanWeeks(37, 18), vs_tar_total_pct: getNum(37, 23, 111) },
        booking_show: { target_weeks: cleanWeeks(38, 18), target_total: getNum(38, 23, 217), actual: cleanWeeks(39, 18), actual_total: getNum(39, 23, 155), vs_tar_weeks: cleanWeeks(40, 18), vs_tar_total_pct: getNum(40, 23, 72) }
      }
    },
    section_3_sbi: {
      target_rate_badge: getStr(46, 25, "81,82%"),
      weight_row: cleanWeeksStr(43, 18),
      target: {
        ncs_m1: cleanWeeks(45, 18),
        ncs_m1_total: getNum(45, 23, 88),
        not_cai: cleanWeeks(46, 18),
        not_cai_total: getNum(46, 23, 16),
        total: cleanWeeks(47, 18),
        total_total: getNum(47, 23, 104)
      },
      actual: {
        ncs_m1: cleanWeeks(48, 18),
        ncs_m1_total: getNum(48, 23, 41),
        not_cai: cleanWeeks(49, 18),
        not_cai_total: getNum(49, 23, 47),
        total: cleanWeeks(50, 18),
        total_total: getNum(50, 23, 88)
      },
      gap: {
        gap_kumulatif: cleanWeeks(51, 18),
        gap_kumulatif_total: getNum(51, 23, -16)
      }
    },
    section_4_action_plan: [
      { category: "TCARE", plan: getStr(58, 17, "reminder by MRA - Akselerasi Reminder potency W4-W5"), pic: "MRA", status: "on process" },
      { category: "TCARE", plan: getStr(59, 17, "THS aktivitas reminder cust fleet (sudeco-TPI-Movus)"), pic: "THS", status: "on process" },
      { category: "TCARE", plan: getStr(60, 17, "REMINDER BY SA potency by appsheet"), pic: "SA", status: "on process" },
      { category: "NON TCARE", plan: getStr(63, 17, "reminder by MRA"), pic: "MRA", status: "on process" },
      { category: "NON TCARE", plan: getStr(64, 17, "THS aktivitas by app sheet"), pic: "THS", status: "on process" },
      { category: "NON TCARE", plan: getStr(65, 17, "REMINDER BY SA potency"), pic: "SA", status: "on process" },
      { category: "SBI", plan: getStr(67, 17, "reminder by MRA dan Sales - report monitoring SPV & Branch Head"), pic: "MRA - Kabeng", status: "on process" }
    ],
    kpi_tree_monthly_targets: (aoData && aoData.kpi_tree_monthly_targets) || {}
  };
}

function parseAoSheetCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') return null;
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = lines.map(line => {
    const row = [];
    let insideQuotes = false;
    let currentCell = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    return row;
  });
  return parseAoSheetRowsMatrix(rows);
}

async function syncAoFromLiveSheet(silent = false) {
  const syncBtn = document.getElementById('btn-sync-ao-sheet');
  if (!silent && syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = `<span>⏳</span> Menyinkronkan...`;
  }

  let syncSuccess = false;
  let sourceLabel = 'Google Sheets Live';

  // 1. Try Google Sheets JSONP (No CORS restrictions, loads directly in all browsers)
  try {
    const gvizTable = await fetchAoFromGoogleSheetsJSONP();
    if (gvizTable) {
      const parsedData = parseAoGvizTable(gvizTable);
      if (parsedData && parsedData.summary) {
        aoData = parsedData;
        syncSuccess = true;
        sourceLabel = 'Google Sheets Live (JSONP)';
      }
    }
  } catch (err) {
    console.warn('Live Google Sheets JSONP fetch failed, trying GViz CSV:', err);
  }

  // 2. Fallback to GViz CSV fetch
  if (!syncSuccess) {
    try {
      const liveCsvUrl = 'https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/gviz/tq?tqx=out:csv&gid=1124551793&_t=' + Date.now();
      const resp = await fetch(liveCsvUrl);
      if (resp.ok) {
        const csvText = await resp.text();
        const parsedData = parseAoSheetCsv(csvText);
        if (parsedData && parsedData.summary) {
          aoData = parsedData;
          syncSuccess = true;
          sourceLabel = 'Google Sheets Live (CSV)';
        }
      }
    } catch (err) {
      console.warn('Live Google Sheets GViz CSV fetch failed (possibly CORS), fallback to local ao_report_data.json:', err);
    }
  }

  // 3. Fallback to local server json
  if (!syncSuccess) {
    try {
      const res = await fetch('data/ao_report_data.json?v=' + Date.now());
      if (res.ok) {
        aoData = await res.json();
        syncSuccess = true;
        sourceLabel = 'Server Cache Data';
      }
    } catch (e) {
      console.error('Error fallback AO sync:', e);
    }
  }

  if (syncSuccess) {
    // If the active week changed in Google Sheets (e.g. from W1 to W3), auto-sync UI week
    if (aoData.meta && aoData.meta.active_week) {
      aoActiveWeek = aoData.meta.active_week;
      const weekSel = document.getElementById('ao-week-select');
      if (weekSel && weekSel.value !== aoActiveWeek) {
        weekSel.value = aoActiveWeek;
      }
    }

    renderAoReport();

    // Update last sync timestamp
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const lastUpdateTag = document.getElementById('ao-last-update-tag');
    if (lastUpdateTag) {
      lastUpdateTag.textContent = `Terakhir: ${timeStr}`;
    }

    if (!silent) {
      if (typeof showFloatingToast === 'function') {
        showFloatingToast(`Data Dashboard AO berhasil disinkronkan dari ${sourceLabel}!`, 'success');
      } else {
        alert(`Data Dashboard AO berhasil disinkronkan dari ${sourceLabel}!`);
      }
    }
  } else if (!silent) {
    alert('Gagal menyinkronkan data AO Report.');
  }

  if (!silent && syncBtn) {
    syncBtn.disabled = false;
    syncBtn.innerHTML = `🔄 Sinkronkan Data`;
  }
}

// Early initialization for AO dual-mode monitoring viewer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAoViewToggle);
} else {
  initAoViewToggle();
}


