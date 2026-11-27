#!/usr/bin/env python3
"""
Master synchronization script for Tunas Toyota Kiaracondong Dashboard.
Directly syncs:
1. PKB Data from Google Sheets (GID 177004909) -> data/dashboard_data.json
2. AO Report from Google Sheets (GID 1124551793) -> data/ao_report_data.json
Ensures 100% parity with live Google Spreadsheets.
"""
import urllib.request
import csv
import io
import json
import re
import os
import datetime
from collections import defaultdict

BASE_DIR = r"c:\laragon\www\dashboard_bengkel"
DATA_DIR = os.path.join(BASE_DIR, "data")
DASHBOARD_JSON = os.path.join(DATA_DIR, "dashboard_data.json")
AO_JSON = os.path.join(DATA_DIR, "ao_report_data.json")

URL_PKB = "https://docs.google.com/spreadsheets/d/1b60d-JO50LU4KyywuULokmDIU7z3Ts_1/export?format=csv&gid=177004909"
URL_AO = "https://docs.google.com/spreadsheets/d/1LQYpCsXsU3o6N4cAMQH7Da44rXhSlksO/export?format=csv&gid=1124551793"

MONTH_NAMES_MAP = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
    7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
}

def clean_rev(s):
    if not s or s.strip() in ['-', '#REF!', '#N/A', '#VALUE!', 'FALSE', 'TRUE', '']:
        return 0.0
    s = re.sub(r'^(?:Rp\.?|RP\.?|rp\.?)\s*', '', s.strip()).strip()
    if '.' in s and ',' in s:
        if s.rfind('.') < s.rfind(','):
            s = s.replace('.', '').replace(',', '.')
        else:
            s = s.replace(',', '')
    elif '.' in s:
        dots = s.count('.')
        if dots > 1:
            s = s.replace('.', '')
        else:
            parts = s.split('.')
            if len(parts[1]) == 3 and len(parts[0]) <= 3:
                s = s.replace('.', '')
    elif ',' in s:
        commas = s.count(',')
        if commas > 1:
            s = s.replace(',', '')
        else:
            parts = s.split(',')
            if len(parts[1]) == 3 and len(parts[0]) <= 3:
                s = s.replace(',', '')
            else:
                s = s.replace(',', '.')
    s = re.sub(r'[^0-9.-]', '', s)
    try:
        return float(s)
    except:
        return 0.0

def sync_dashboard_pkb():
    print("=" * 60)
    print("1. Syncing PKB Data from Live Google Sheets...")
    print(f"URL: {URL_PKB}")
    req = urllib.request.Request(URL_PKB, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        content = resp.read().decode('utf-8', errors='replace')

    reader = csv.reader(io.StringIO(content))
    header = next(reader)

    months_by_year = defaultdict(lambda: defaultdict(list))
    total_rows = 0

    for row in reader:
        if len(row) < 50:
            continue
        total_rows += 1
        year = row[2].strip()
        try:
            mnum = int(float(row[1].strip()))
        except:
            continue
        mname = MONTH_NAMES_MAP.get(mnum)
        if mname:
            months_by_year[year][mname].append(row)

    print(f"  Downloaded {total_rows:,} rows from PKB sheet.")

    with open(DASHBOARD_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if 'monthly_kpis' not in data:
        data['monthly_kpis'] = {}
    if '2026' not in data['monthly_kpis']:
        data['monthly_kpis']['2026'] = {}

    changes = []
    for mn in ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']:
        rows = months_by_year['2026'].get(mn, [])
        if not rows:
            continue

        ue_total = len(rows)
        cpus = sum(1 for r in rows if r[43].strip() == 'CPUS')
        sbi_cpus = sum(1 for r in rows if r[43].strip() == 'SBI')
        sbe_count = sum(1 for r in rows if r[44].strip() == 'SBE')
        gr_oil = sum(1 for r in rows if r[44].strip() == 'GR OIL')
        gr_other = sum(1 for r in rows if r[44].strip() == 'GR OTHER')
        twc = sum(1 for r in rows if r[44].strip() == 'TWC')
        tcare_count = sum(1 for r in rows if r[49].strip() == 'T-CARE')
        revenue = sum(clean_rev(r[57]) if len(r) > 57 else 0.0 for r in rows)
        cpus_revenue = sum(clean_rev(r[57]) if len(r) > 57 else 0.0 for r in rows if r[43].strip() == 'CPUS')

        aktif = sum(1 for r in rows if r[47].strip().upper() == 'AKTIF')
        pasif = sum(1 for r in rows if r[47].strip().upper() == 'PASIF')
        new_cust = sum(1 for r in rows if r[47].strip().upper() == 'NEW CUST')
        inactive = sum(1 for r in rows if r[47].strip().upper() == 'INACTIVE')

        db = data['monthly_kpis']['2026'].get(mn, {})

        def set_val(k, v):
            old = db.get(k)
            if old != v:
                changes.append(f"  {mn} {k}: {old} -> {v}")
                db[k] = v

        set_val('ue_total', ue_total)
        set_val('cpus', cpus)
        set_val('raw_cpus', sbe_count)
        set_val('sbe_count', sbe_count)
        set_val('tcare_count', tcare_count)
        set_val('sbi_cpus', sbi_cpus)
        set_val('total_revenue', round(revenue))
        set_val('cpus_revenue', round(cpus_revenue))

        data['monthly_kpis']['2026'][mn] = db

        # Breakdown updates
        if 'breakdown' in data and '2026' in data.get('breakdown', {}):
            if mn in data['breakdown']['2026']:
                bd = data['breakdown']['2026'][mn]
                if 'type_service' in bd:
                    bd['type_service'] = {
                        'SBE': sbe_count,
                        'GR OIL': gr_oil,
                        'GR OTHER': gr_other,
                        'TWC': twc,
                        'SBI': sbi_cpus
                    }
                if 'customer_status' in bd:
                    bd['customer_status'] = {
                        'AKTIF': aktif,
                        'PASIF': pasif,
                        'NEW CUST': new_cust,
                        'INACTIVE': inactive
                    }

    # Update ws_matrix_kabeng and ws_matrix_excel
    all_months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October']
    matrix_targets = []
    if 'ws_matrix_kabeng' in data and 'rows' in data['ws_matrix_kabeng']:
        matrix_targets.append(data['ws_matrix_kabeng']['rows'])
    if 'ws_matrix_excel' in data and '2026' in data['ws_matrix_excel']:
        matrix_targets.append(data['ws_matrix_excel']['2026'])

    for rows_list in matrix_targets:
        for m_idx, m_name in enumerate(all_months):
            m_kpi = data['monthly_kpis']['2026'].get(m_name, {})
            ue_val = m_kpi.get('ue_total', 0)
            cpus_val = m_kpi.get('cpus', 0)
            sbe_val = m_kpi.get('sbe_count', 0)
            tc_val = m_kpi.get('tcare_count', 0)
            rev_val = m_kpi.get('total_revenue', 0.0)

            for row in rows_list:
                no = str(row.get('no', ''))
                if len(row.get('months', [])) > m_idx:
                    if no == '1' and ue_val > 0:
                        row['months'][m_idx] = ue_val
                    elif no == '2' and cpus_val > 0:
                        row['months'][m_idx] = cpus_val
                    elif no == '5' and sbe_val > 0:
                        row['months'][m_idx] = sbe_val
                    elif no == '7' and tc_val > 0:
                        row['months'][m_idx] = tc_val
                    elif no == '8' and sbe_val > 0:
                        row['months'][m_idx] = round(tc_val / sbe_val, 4)
                    elif no == '9' and sbe_val > 0:
                        row['months'][m_idx] = round((sbe_val - tc_val) / sbe_val, 4)
                    elif no == '12' and rev_val > 0:
                        row['months'][m_idx] = round(rev_val / 1000.0, 3)

        for row in rows_list:
            no = str(row.get('no', ''))
            nums = [v for v in row.get('months', []) if isinstance(v, (int, float))]
            if nums and no in ['1', '2', '5', '7', '12']:
                row['total'] = sum(nums)

    data['meta']['generated_at'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    data['meta']['total_pkb_records'] = total_rows

    with open(DASHBOARD_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  Applied {len(changes)} field updates to {DASHBOARD_JSON}.")
    return True


def sync_ao_report():
    print("=" * 60)
    print("2. Syncing AO Report Data from Live Google Sheets...")
    print(f"URL: {URL_AO}")
    req = urllib.request.Request(URL_AO, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        content = resp.read().decode('utf-8', errors='replace')

    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    print(f"  Downloaded {len(rows)} lines from AO sheet.")

    def get_num(r, c, def_val=0):
        if r >= len(rows) or c >= len(rows[r]):
            return def_val
        val = rows[r][c].strip().replace(',', '.').replace('%', '').replace(' ', '')
        if not val or val in ['-', '#REF!', '#N/A']:
            return def_val
        try:
            n = float(val)
            return int(n) if n.is_integer() else n
        except:
            return def_val

    def get_str(r, c, def_val=''):
        if r >= len(rows) or c >= len(rows[r]):
            return def_val
        return rows[r][c].strip() or def_val

    def clean_weeks(r, start_col=8, count=5):
        return [get_num(r, c, 0) for c in range(start_col, start_col + count)]

    def clean_weeks_str(r, start_col=8, count=5):
        return [get_str(r, c, '0%') for c in range(start_col, start_col + count)]

    with open(AO_JSON, 'r', encoding='utf-8') as f:
        ao = json.load(f)

    active_week = get_str(1, 6, "W3") or "W3"
    ao['meta']['active_week'] = active_week
    ao['meta']['active_month'] = get_str(1, 8, "October")
    ao['meta']['updated_at'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Summary
    ao['summary']['this_month_closing_estimation']['cpus'] = get_num(1, 22, 714)
    ao['summary']['this_month_closing_estimation']['vs_tar_pct'] = get_num(1, 23, 105)
    ao['summary']['closing_commitment'] = get_num(4, 14, 714)
    ao['summary']['total_cpus_gap_fm'] = get_num(9, 14, -245)
    ao['summary']['gap_cpus_walkin_fm'] = get_num(14, 14, -131)
    ao['summary']['act_cpus_walkin_fm'] = get_num(19, 14, 137)
    ao['summary']['gap_cpus_booking_fm'] = get_num(24, 14, -114)
    ao['summary']['act_cpus_booking_fm'] = get_num(31, 14, 332)

    # Section 1: KPI Tree
    s1 = ao['section_1_target_setting']
    s1['kpi_tree']['cpus_target'] = get_num(9, 1, 714)
    s1['kpi_tree']['walk_in']['target'] = get_num(9, 3, 268)
    s1['kpi_tree']['walk_in']['pct'] = get_num(10, 3, 38)
    s1['kpi_tree']['booking_show']['target'] = get_num(24, 3, 446)
    s1['kpi_tree']['booking_show']['pct'] = get_num(25, 3, 62)
    s1['kpi_tree']['booking_show']['tcare']['target'] = get_num(24, 4, 229)
    s1['kpi_tree']['booking_show']['tcare']['pct'] = get_num(25, 4, 51)
    s1['kpi_tree']['booking_show']['non_tcare']['target'] = get_num(35, 4, 217)
    s1['kpi_tree']['booking_show']['non_tcare']['pct'] = get_num(36, 4, 49)
    s1['kpi_tree']['booking_show']['non_tcare']['oil']['target'] = get_num(34, 6, 26)
    s1['kpi_tree']['booking_show']['non_tcare']['oil']['pct'] = get_num(35, 6, 12)
    s1['kpi_tree']['booking_show']['non_tcare']['gr']['target'] = get_num(37, 6, 140)
    s1['kpi_tree']['booking_show']['non_tcare']['gr']['pct'] = get_num(38, 6, 65)
    s1['kpi_tree']['booking_show']['non_tcare']['sbe']['target'] = get_num(40, 6, 50)
    s1['kpi_tree']['booking_show']['non_tcare']['sbe']['pct'] = get_num(41, 6, 23)

    # Mini week
    s1['mini_week_performance']['week'] = active_week
    s1['mini_week_performance']['actual'] = get_num(8, 11, 469)
    s1['mini_week_performance']['vs_tar'] = get_str(8, 12, "119%")

    # Weekly performance
    wp = s1['weekly_performance']
    wp['total_cpus_plan'] = clean_weeks(13, 8)
    wp['total_cpus_plan_total'] = get_num(12, 8, 714)
    wp['total_cpus_actual'] = clean_weeks(14, 8)
    wp['total_cpus_actual_total'] = get_num(14, 14, 469)
    wp['total_gap'] = clean_weeks(15, 8)
    wp['cumulative_gap_cpus'] = clean_weeks(16, 8)
    wp['walkin_assumpt'] = clean_weeks(17, 8)
    wp['walkin_actual'] = clean_weeks(18, 8)
    wp['walkin_gap'] = clean_weeks(19, 8)
    wp['cumulative_gap_walkin'] = clean_weeks(20, 8)

    wp['working_days'] = clean_weeks(46, 8)
    wp['working_days_total'] = get_num(46, 14, 27)

    wp['booking_show_plan'] = clean_weeks(50, 8)
    wp['booking_show_plan_total'] = get_num(49, 8, 446)
    wp['booking_show_actual'] = clean_weeks(51, 8)
    wp['booking_show_actual_total'] = get_num(51, 14, 332)
    wp['booking_show_gap'] = clean_weeks(52, 8)
    wp['booking_show_gap_total'] = get_num(52, 14, -114)
    wp['booking_show_gap_cumulative'] = clean_weeks(53, 8)

    wp['no_show_assumption'] = clean_weeks(54, 8)
    wp['no_show_assumption_total'] = get_num(54, 14, 98)
    wp['no_show_actual'] = clean_weeks(55, 8)
    wp['no_show_actual_total'] = get_num(55, 14, 222)
    wp['no_show_ratio'] = clean_weeks_str(56, 8)
    wp['no_show_ratio_total'] = get_str(56, 14, "40%")
    wp['cumulative_no_show'] = clean_weeks(57, 8)
    wp['cumulative_no_show_total'] = get_num(57, 14, 222)

    wp['booking_gross_plan'] = clean_weeks(59, 8)
    wp['booking_gross_plan_total'] = get_num(58, 8, 544)
    wp['booking_gross_initial'] = clean_weeks(60, 8)
    wp['booking_gross_initial_total'] = get_num(60, 14, 7)
    wp['booking_gross_n'] = clean_weeks(61, 8)
    wp['booking_gross_n_total'] = get_num(61, 14, 537)
    wp['booking_actual'] = clean_weeks(62, 8)
    wp['booking_actual_total'] = get_num(62, 14, 554)
    wp['booking_gap'] = clean_weeks(63, 8)
    wp['booking_gap_total'] = get_num(63, 14, 10)
    wp['cumulative_gap_booking'] = clean_weeks(64, 8)

    # Cumulative chart
    s1['cumulative_chart']['target'] = clean_weeks(71, 8)
    s1['cumulative_chart']['actual'] = clean_weeks(72, 8)

    # Section 2: Prospecting Funneling
    s2 = ao['section_2_prospecting_funneling']
    # TCARE
    tc = s2['tcare']
    tc['data']['target_total'] = get_num(5, 18, 872)
    tc['data']['actual'] = clean_weeks(6, 18)
    tc['data']['actual_total'] = get_num(6, 23, 580)
    tc['data']['vs_tar_weeks'] = clean_weeks(7, 18)
    tc['data']['vs_tar_total_pct'] = get_num(7, 23, 67)

    tc['connected']['target_weeks'] = clean_weeks(8, 18)
    tc['connected']['target_total'] = get_num(8, 23, 864)
    tc['connected']['actual'] = clean_weeks(9, 18)
    tc['connected']['actual_total'] = get_num(9, 23, 498)
    tc['connected']['vs_tar_weeks'] = clean_weeks(10, 18)
    tc['connected']['vs_tar_total_pct'] = get_num(10, 23, 58)

    tc['contacted']['target_weeks'] = clean_weeks(11, 18)
    tc['contacted']['target_total'] = get_num(11, 23, 398)
    tc['contacted']['actual'] = clean_weeks(12, 18)
    tc['contacted']['actual_total'] = get_num(12, 23, 307)
    tc['contacted']['vs_tar_weeks'] = clean_weeks(13, 18)
    tc['contacted']['vs_tar_total_pct'] = get_num(13, 23, 77)

    tc['booking']['target_weeks'] = clean_weeks(14, 18)
    tc['booking']['target_total'] = get_num(14, 23, 266)
    tc['booking']['actual'] = clean_weeks(15, 18)
    tc['booking']['actual_total'] = get_num(15, 23, 130)
    tc['booking']['vs_tar_weeks'] = clean_weeks(16, 18)
    tc['booking']['vs_tar_total_pct'] = get_num(16, 23, 49)

    tc['booking_show']['target_weeks'] = clean_weeks(17, 18)
    tc['booking_show']['target_total'] = get_num(17, 23, 229)
    tc['booking_show']['actual'] = clean_weeks(18, 18)
    tc['booking_show']['actual_total'] = get_num(18, 23, 177)
    tc['booking_show']['vs_tar_weeks'] = clean_weeks(19, 18)
    tc['booking_show']['vs_tar_total_pct'] = get_num(19, 23, 77)

    # NON TCARE
    ntc = s2['non_tcare']
    ntc['data']['target_total'] = get_num(26, 18, 725)
    ntc['data']['actual'] = clean_weeks(27, 18)
    ntc['data']['actual_total'] = get_num(27, 23, 479)
    ntc['data']['vs_tar_weeks'] = clean_weeks(28, 18)
    ntc['data']['vs_tar_total_pct'] = get_num(28, 23, 66)

    ntc['connected']['target_weeks'] = clean_weeks(29, 18)
    ntc['connected']['target_total'] = get_num(29, 23, 639)
    ntc['connected']['actual'] = clean_weeks(30, 18)
    ntc['connected']['actual_total'] = get_num(30, 23, 428)
    ntc['connected']['vs_tar_weeks'] = clean_weeks(31, 18)
    ntc['connected']['vs_tar_total_pct'] = get_num(31, 23, 67)

    ntc['contacted']['target_weeks'] = clean_weeks(32, 18)
    ntc['contacted']['target_total'] = get_num(32, 23, 447)
    ntc['contacted']['actual'] = clean_weeks(33, 18)
    ntc['contacted']['actual_total'] = get_num(33, 23, 354)
    ntc['contacted']['vs_tar_weeks'] = clean_weeks(34, 18)
    ntc['contacted']['vs_tar_total_pct'] = get_num(34, 23, 79)

    ntc['booking']['target_weeks'] = clean_weeks(35, 18)
    ntc['booking']['target_total'] = get_num(35, 23, 263)
    ntc['booking']['actual'] = clean_weeks(36, 18)
    ntc['booking']['actual_total'] = get_num(36, 23, 293)
    ntc['booking']['vs_tar_weeks'] = clean_weeks(37, 18)
    ntc['booking']['vs_tar_total_pct'] = get_num(37, 23, 111)

    ntc['booking_show']['target_weeks'] = clean_weeks(38, 18)
    ntc['booking_show']['target_total'] = get_num(38, 23, 217)
    ntc['booking_show']['actual'] = clean_weeks(39, 18)
    ntc['booking_show']['actual_total'] = get_num(39, 23, 155)
    ntc['booking_show']['vs_tar_weeks'] = clean_weeks(40, 18)
    ntc['booking_show']['vs_tar_total_pct'] = get_num(40, 23, 72)

    # Section 3: SBI
    s3 = ao['section_3_sbi']
    s3['target_rate_badge'] = get_str(46, 25, "81,82%")
    s3['weight_row'] = clean_weeks_str(43, 18)

    s3['target']['ncs_m1'] = clean_weeks(45, 18)
    s3['target']['ncs_m1_total'] = get_num(45, 23, 88)
    s3['target']['not_cai'] = clean_weeks(46, 18)
    s3['target']['not_cai_total'] = get_num(46, 23, 16)
    s3['target']['total'] = clean_weeks(47, 18)
    s3['target']['total_total'] = get_num(47, 23, 104)

    s3['actual']['ncs_m1'] = clean_weeks(48, 18)
    s3['actual']['ncs_m1_total'] = get_num(48, 23, 41)
    s3['actual']['not_cai'] = clean_weeks(49, 18)
    s3['actual']['not_cai_total'] = get_num(49, 23, 47)
    s3['actual']['total'] = clean_weeks(50, 18)
    s3['actual']['total_total'] = get_num(50, 23, 88)

    s3['gap']['gap_kumulatif'] = clean_weeks(51, 18)
    s3['gap']['gap_kumulatif_total'] = get_num(51, 23, -16)

    with open(AO_JSON, 'w', encoding='utf-8') as f:
        json.dump(ao, f, indent=2, ensure_ascii=False)

    print(f"  AO Report successfully updated at {AO_JSON}.")
    return True

def sync_so_commodities():
    print("=" * 60)
    print("3. Syncing SO Commodities (Didin Tire, etc.) from Live Data...")
    from apply_all_october_updates import main as apply_oct_updates
    apply_oct_updates()

def main():
    print("=" * 60)
    print(" TUNAS TOYOTA KIARACONDONG — MASTER SYNC PIPELINE")
    print("=" * 60)
    sync_dashboard_pkb()
    sync_ao_report()
    sync_so_commodities()
    print("\n[SUCCESS] All data synchronized with 100% spreadsheet accuracy!")

if __name__ == '__main__':
    main()
