import pandas as pd, numpy as np, json, re

df = pd.read_csv('/mnt/user-data/uploads/nb2026_tracks.csv')
df.loc[df['boat_id']==98, 'boat_name'] = 'Phoenix F40'
df.loc[df['boat_id']==99, 'boat_name'] = 'Phoenix J120'
df.loc[df['boat_name']=='Madcap (Madcap/Smee Again Syndicate)', 'boat_name'] = 'Madcap'
df['ts'] = pd.to_datetime(df['epoch'], unit='s', utc=True)
df = df.sort_values(['boat_id','epoch']).reset_index(drop=True)
R = 3440.065
START = (41.4868, -71.3415); FIN = (32.3618, -64.6303)

def hav(lat1, lon1, lat2, lon2):
    p1,p2,l1,l2 = map(np.radians,[lat1,lat2,lon1,lon2])
    a = np.sin((p2-p1)/2)**2 + np.cos(p1)*np.cos(p2)*np.sin((l2-l1)/2)**2
    return 2*R*np.arcsin(np.sqrt(a))
def bearing(lat1,lon1,lat2,lon2):
    p1,p2,l1,l2 = map(np.radians,[lat1,lat2,lon1,lon2])
    y = np.sin(l2-l1)*np.cos(p2); x = np.cos(p1)*np.sin(p2)-np.sin(p1)*np.cos(p2)*np.cos(l2-l1)
    return np.arctan2(y,x)
T12 = bearing(*START,*FIN)
def xte_east(lat, lon):
    d13 = hav(START[0],START[1],lat,lon)/R
    t13 = bearing(START[0],START[1],lat,lon)
    return -np.arcsin(np.sin(d13)*np.sin(t13-T12))*R

# rank, csv_name, sail, tcf, elapsed, corrected, type, finish_clock_edt(HH:MM:SS), finish_date
SDL = [
(1,'Nicole','USA2021',0.5004,'4d 03:01:51','2d 01:33:18','Cal 40','17:31:51','2026-06-23'),
(2,'Selkie','USA40808',0.5054,'4d 02:37:57','2d 01:50:56','McCurdy&Rhodes 38','17:07:57','2026-06-23'),
(3,'Towhee','USA1781',0.5001,'4d 04:24:52','2d 02:13:02','Cal 40','18:54:52','2026-06-23'),
(4,'Inverness','USA990',0.5025,'4d 04:48:14','2d 02:39:14','Custom S&S','19:18:14','2026-06-23'),
(5,'Tacktile','USA56',0.5234,'4d 03:17:57','2d 03:58:23','Sabre 42 CB','17:47:57','2026-06-23'),
(6,'Dorade','16',0.5455,'4d 00:08:54','2d 04:26:56','S&S Masthead Yawl','14:38:54','2026-06-23'),
(7,'Carina','USA315',0.5653,'3d 20:49:36','2d 04:28:30','McCurdy & Rhodes 48','11:19:36','2026-06-23'),
(8,'Imagine','USA108',0.5409,'4d 02:07:38','2d 05:04:37','X382','16:37:38','2026-06-23'),
(9,'Madeleine','USA414',0.5476,'4d 01:36:12','2d 05:26:51','McCurdy Rhodes 46','16:06:12','2026-06-23'),
(10,'Invincible','NA26',0.5541,'4d 00:43:27','2d 05:35:41','Navy 44','15:13:27','2026-06-23'),
(11,'Stormy Weather','52526',0.5556,'4d 00:58:26','2d 05:52:43','Swan 441','15:28:26','2026-06-23'),
(12,'Allegiant','USA93556',0.5596,'4d 00:35:33','2d 06:03:11','J/42','15:05:33','2026-06-23'),
(13,'Gesture','102',0.5719,'3d 23:37:44','2d 06:41:25','S&S Sloop','13:57:44','2026-06-23'),
(14,'Blue Skies','44022',0.5757,'3d 23:43:18','2d 07:06:25','Skye 51 Ketch','14:03:18','2026-06-23'),
(15,'Flying Lady','USA50197',0.5673,'4d 01:32:55','2d 07:20:22','Swan 46','15:52:55','2026-06-23'),
(16,'Sassafras','CAN3100',0.5551,'4d 03:46:56','2d 07:23:21','Swan 47 Mark 2','17:46:56','2026-06-23'),
(17,'Speck','59916',0.5948,'3d 22:23:33','2d 08:08:41','J/120','12:23:33','2026-06-23'),
(18,'Cybele','52045',0.6132,'3d 19:33:54','2d 08:08:52','IMX 45','09:23:54','2026-06-23'),
(19,'Hound','USA2650',0.6120,'3d 19:46:23','2d 08:09:54','Nielsen 59','09:26:23','2026-06-23'),
(20,'Xcellent','USA51442',0.5942,'3d 22:39:36','2d 08:14:49','XYachts X442','12:29:36','2026-06-23'),
(21,'Dragon Fire','USA145',0.5755,'4d 01:51:10','2d 08:18:51','J99','16:21:10','2026-06-23'),
(22,'Orion','USA12282',0.6017,'3d 21:40:59','2d 08:22:09','J/122','11:40:59','2026-06-23'),
(23,'Christopher Dragon','ITA2277',0.5942,'3d 22:59:32','2d 08:26:40','Italia Yachts 11.9','13:19:32','2026-06-23'),
(24,'Phoenix F40','USA93063',0.5751,'4d 02:10:24','2d 08:27:34','Beneteau First 40.7','16:40:24','2026-06-23'),
(25,'Reindeer','USA666',0.6135,'3d 20:03:53','2d 08:28:54','Morris 47','09:43:53','2026-06-23'),
(26,'In Theory','USA61183',0.6045,'3d 21:35:54','2d 08:34:49','JPK 1080','11:55:54','2026-06-23'),
(27,'Moon Dog','USA52129',0.5830,'4d 01:42:36','2d 08:57:54','C&C 115','16:12:36','2026-06-23'),
(28,'Cercavento','11980',0.5902,'4d 00:32:49','2d 08:58:55','Italia 11.98','14:52:49','2026-06-23'),
(29,'Bella J','CAN54554',0.6115,'3d 21:11:58','2d 08:59:29','J/133','11:01:58','2026-06-23'),
(30,'Divide By Zero','USA42707',0.5903,'4d 00:34:53','2d 09:00:43','Frers 45','14:54:53','2026-06-23'),
(31,'Zig Zag','USA12912',0.6102,'3d 21:29:57','2d 09:03:11','J/122','11:29:57','2026-06-23'),
(32,'Moxiee','USA60085',0.5960,'3d 23:50:12','2d 09:07:07','J/122','13:50:12','2026-06-23'),
(33,'Alibi','USA43968',0.5961,'3d 23:51:42','2d 09:08:35','J/120','13:51:42','2026-06-23'),
(34,'Blitzkrieg','52901',0.6054,'3d 22:28:00','2d 09:11:24','J/122','12:28:00','2026-06-23'),
(35,'Vamoose','USA52443',0.6142,'3d 21:26:30','2d 09:23:31','J/133','11:16:30','2026-06-23'),
(36,'Charlotte','USA46650',0.6028,'3d 23:20:16','2d 09:28:11','J/120','13:20:16','2026-06-23'),
(37,'Rocket Science','USA51512',0.5977,'4d 00:19:36','2d 09:34:28','J/120','14:19:36','2026-06-23'),
(38,'Surface Tension','52556',0.6032,'3d 23:27:41','2d 09:34:56','Beneteau First 44.7','13:17:41','2026-06-23'),
(39,'Summer Grace','US12235',0.6035,'3d 23:29:23','2d 09:37:41','J/122','13:29:23','2026-06-23'),
(40,'Digger','USA49',0.6054,'3d 23:16:11','2d 09:40:35','J/44','13:06:11','2026-06-23'),
(41,'Palantir 5','USA25244',0.6049,'3d 23:29:38','2d 09:45:51','J/44','13:19:38','2026-06-23'),
(42,'Rumble','USA61782',0.5928,'4d 01:32:33','2d 09:49:23','JPK 10.30','16:02:33','2026-06-23'),
(43,'Escapado','GBR1321L',0.5684,'4d 05:48:21','2d 09:51:59','First 40.7','20:18:21','2026-06-23'),
(44,'Hissy Fit  II','77',0.5976,'4d 01:00:43','2d 09:58:28','J/120','15:00:43','2026-06-23'),
(45,'Phoenix J120','USA25329',0.6013,'4d 00:25:21','2d 09:58:44','J/120','14:25:21','2026-06-23'),
(46,'Ragana','52238',0.5945,'4d 01:34:52','2d 10:00:43','Cape Fear 38','15:54:52','2026-06-23'),
(47,'Banter','USA61682',0.6059,'3d 23:55:15','2d 10:07:06','Archambault 40RC','13:45:15','2026-06-23'),
(48,'Zelee','GBR1030X',0.5899,'4d 02:37:26','2d 10:10:42','JPK 10.30','17:07:26','2026-06-23'),
(49,'Dire Wolf','USA12204',0.6001,'4d 01:05:45','2d 10:16:02','J/122','15:05:45','2026-06-23'),
(50,'Blitzen','USA46',0.6081,'4d 00:00:24','2d 10:22:54','J/130 SD','13:50:24','2026-06-23'),
(51,'Jules','USA52300',0.6159,'3d 23:00:33','2d 10:30:58','Baltic 52','12:30:33','2026-06-23'),
(52,'Phantom','USA60711',0.6167,'3d 22:54:55','2d 10:32:03','Xp 44','12:34:55','2026-06-23'),
(53,'Legacy','USA60483',0.5955,'4d 02:21:41','2d 10:34:27','Beneteau First 40','16:41:41','2026-06-23'),
(54,'Lynx','US62157',0.6135,'3d 23:32:23','2d 10:36:49','IMX 45','13:12:23','2026-06-23'),
(55,'Windborn','USA51120',0.6014,'4d 01:39:39','2d 10:44:00','J/120','15:39:39','2026-06-23'),
(56,'Firefly','USA50022',0.6132,'4d 00:05:13','2d 10:55:14','Morris 45','13:45:13','2026-06-23'),
(57,'Monhegan','USA35777',0.5976,'4d 02:46:00','2d 11:01:23','J44','16:36:00','2026-06-23'),
(58,'Lykke','ARG5001',0.5952,'4d 03:10:30','2d 11:01:44','X 4.3','17:00:30','2026-06-23'),
(59,'Lupo Di Mare','USA12985',0.6085,'4d 01:03:50','2d 11:03:48','Italia 12.98','14:53:50','2026-06-23'),
(60,'Quickdraw','USA104',0.6112,'4d 01:00:05','2d 11:17:14','J/111','15:20:05','2026-06-23'),
(61,'Arcadia','USA61520',0.6127,'4d 00:49:37','2d 11:19:33','Lm46','14:29:37','2026-06-23'),
(62,'Sonrisa','USA1416',0.6164,'4d 00:22:20','2d 11:24:14','Xp 44','14:02:20','2026-06-23'),
(63,'Northstar','USA2681',0.6169,'4d 00:17:42','2d 11:24:16','Solaris 47','13:47:42','2026-06-23'),
(64,'Chariad','50513',0.6101,'4d 02:14:18','2d 11:56:07','J-130','15:54:18','2026-06-23'),
(65,'Rocksteady','USA60492',0.6303,'3d 23:41:08','2d 12:18:38','XP44','13:21:08','2026-06-23'),
(66,'Touch of Grey','USA68750',0.6364,'3d 23:30:52','2d 12:47:07','J/121','13:10:52','2026-06-23'),
(67,'Wild Blue','USA52920',0.6093,'4d 03:54:21','2d 12:52:21','J/122','17:54:21','2026-06-23'),
(68,'Boudicca','USA50085',0.9713,'2d 17:31:57','2d 15:39:06','R/P 66','06:51:57','2026-06-22'),
(69,'Gemini II','USA45454',0.7001,'3d 19:47:14','2d 16:15:37','Swan 45','09:17:14','2026-06-23'),
(70,'Sailfly','US52821',0.6543,'4d 02:39:54','2d 16:33:23','Swan 56','15:59:54','2026-06-23'),
(71,'Safir','52918',0.6928,'3d 21:25:22','2d 16:43:24','Arcona 460','10:55:22','2026-06-23'),
(72,'Crazy Horse','43777',0.7220,'3d 18:37:04','2d 17:25:34','Baltic 50 Custom','08:07:04','2026-06-23'),
(73,'Scylla','60739',0.6829,'3d 23:51:40','2d 17:27:49','Dehler 46','13:21:40','2026-06-23'),
(74,'Madcap','USA51092',0.7513,'3d 15:22:39','2d 17:38:48','Santa Cruz 52','04:42:39','2026-06-23'),
(75,'Good News','USA7065',0.7373,'3d 17:12:43','2d 17:46:33','J/125','06:42:43','2026-06-23'),
(76,'Cool Breeze','USA60432',0.7186,'3d 20:17:29','2d 18:19:14','Mills 43 Custom','09:47:29','2026-06-23'),
(77,'August West','48234',0.7099,'3d 23:33:09','2d 19:49:58','Swan 48','12:23:09','2026-06-23'),
(78,'Polaris','USA66866',0.7233,'3d 23:47:59','2d 21:17:31','Sydney 47','13:17:59','2026-06-23'),
(79,'Wahoo','US52599',0.7741,'3d 17:56:07','2d 21:37:08','Ker 50','07:16:07','2026-06-23'),
(80,'Pterodactyl','USA45045',0.8503,'3d 11:56:42','2d 23:22:42','R/P 45','01:16:42','2026-06-23'),
(81,'Rhumb Runner','USA61489',0.7487,'4d 01:45:16','3d 01:11:20','Neo 430','15:05:16','2026-06-23'),
(82,'Hunter','USA2388',0.7973,'3d 20:53:17','3d 02:03:35','Mills 41','10:13:17','2026-06-23'),
]
DNF = [
 ('Temptation Oakcliff JV66','USA119',1.0000,'JV 66','Mechanical issues'),
 ('Hydromec','CAN17',0.7281,'Farr 40','Rudder damage, all well onboard'),
 ('Dancing Bear','40122',0.5324,'Northeast 39','Damaged rudder cable, all well onboard'),
 ('Cougar','USA4900',0.7118,'J/160 SD','Retired after finish'),
]

def norm(s): return re.sub(r'\s+',' ', s.strip().lower())
CSV_NAMES = df['boat_name'].unique()
CSV_LOOKUP = {}
for n in CSV_NAMES: CSV_LOOKUP.setdefault(norm(n), n)

CLASS_RANKS = {13,14,15,23,26,28,30,53,60}       # SDL 3
NBR_RANKS   = {41,42,43,44,45,47,48,49,50}       # immediate corrected-time neighbors
PODIUM_RANKS= {1,2,3}
CLUB_RANKS  = {66, 69}                            # Touch of Grey, Gemini II — CPYC (confirmed by Brad)

def grp_for(rank):
    if rank == 46: return 'ragana'
    if rank in CLASS_RANKS: return 'class'
    if rank in NBR_RANKS: return 'nbr'
    if rank in PODIUM_RANKS: return 'podium'
    if rank in CLUB_RANKS: return 'club'
    return 'sdl_other'

FEAT = {}
name_misses = []
for rank,name,sail,tcf,el,corr,typ,fin_hms,fin_date in SDL:
    csv_key = CSV_LOOKUP.get(norm(name))
    if not csv_key: name_misses.append(name); continue
    disp = 'RAGANA' if rank==46 else ('Phoenix '+sail if name in ('Phoenix F40','Phoenix J120') else re.sub(r'\s+',' ',name))
    FEAT[csv_key] = dict(disp=disp, typ=typ, tcf=tcf, cls=('SDL 3' if rank in CLASS_RANKS or rank==46 else ''),
        clsPos=None, sdl=rank, corr=corr, el=el, fin=f'{fin_date} {fin_hms}', grp=grp_for(rank), sail=sail)
for name,sail,tcf,typ,reason in DNF:
    csv_key = CSV_LOOKUP.get(norm(name))
    if not csv_key: name_misses.append(name); continue
    FEAT[csv_key] = dict(disp=name, typ=typ, tcf=None, cls='', clsPos=None, sdl=None, corr=None, el=None, fin=None,
        grp='sdl_dnf', sail=sail, retireReason=reason)
FEAT['BLACK JACK 100'] = dict(disp='Black Jack 100', typ='100ft Maxi · line honors', tcf=None, cls='', clsPos=None,
    sdl=None, corr=None, el=None, fin=None, grp='maxi', sail='')
FEAT['OC 86'] = dict(disp='OC 86', typ='Offshore multihull · outside SDL', tcf=None, cls='', clsPos=None,
    sdl=None, corr=None, el=None, fin=None, grp='maxi', sail='')
print("name resolution misses:", name_misses)

# SDL 3 class rank (1-10 within class) — needed for the class-only view
SDL3_DISP = ['Gesture','Blue Skies','Flying Lady','Christopher Dragon','In Theory','Cercavento',
              'Divide By Zero','RAGANA','Legacy','Quickdraw']
disp_to_key = {v['disp']: k for k,v in FEAT.items()}
for i,dname in enumerate(SDL3_DISP, start=1):
    k = disp_to_key.get(dname)
    if k: FEAT[k]['clsPos'] = i

RACE_START = pd.Timestamp('2026-06-19 17:40:00', tz='UTC')

def parse_el(s):
    d, hms = s.split('d '); h,m,sec = hms.split(':')
    return int(d)*86400+int(h)*3600+int(m)*60+int(sec)

def series_for(name, fin_edt):
    sub = df[df['boat_name']==name].copy()
    if fin_edt:
        fin_utc = pd.Timestamp(fin_edt).tz_localize('UTC') + pd.Timedelta(hours=4)
        sub = sub[(sub['ts'] >= RACE_START) & (sub['ts'] <= fin_utc + pd.Timedelta(minutes=3))]
    else:
        sub = sub[sub['ts'] >= RACE_START]
        d = hav(sub['lat'], sub['lon'], *FIN); arr = sub[d < 0.7]
        if len(arr): sub = sub[sub['ts'] <= arr['ts'].iloc[0]]
    sub = sub.drop_duplicates('epoch').reset_index(drop=True)
    if not len(sub): return sub
    sub['dtf'] = hav(sub['lat'], sub['lon'], *FIN)
    sub['xte'] = xte_east(sub['lat'].values, sub['lon'].values)
    ts_s = sub['epoch'].values; sog = np.full(len(sub), np.nan)
    for k in range(len(sub)):
        j = np.searchsorted(ts_s, ts_s[k]-900); m = min(np.searchsorted(ts_s, ts_s[k]+900), len(sub)-1)
        if m > j and ts_s[m]-ts_s[j] > 600:
            dd = hav(sub['lat'].iloc[j], sub['lon'].iloc[j], sub['lat'].iloc[m], sub['lon'].iloc[m])
            sog[k] = dd/((ts_s[m]-ts_s[j])/3600.0)
    sub['sog'] = sog
    return sub

GRID = pd.date_range(RACE_START, '2026-06-25 12:00:00+00:00', freq='15min')
boats_out = {}
feat_series = {}
skipped = []
for name, meta in FEAT.items():
    s = series_for(name, meta['fin'])
    if not len(s):
        skipped.append(name); continue
    feat_series[name] = s
    g = s.set_index('ts')[['lat','lon','dtf','xte','sog']]
    g = g.reindex(g.index.union(GRID)).interpolate('time', limit=4).reindex(GRID)
    g = g[g.index <= s['ts'].max()]
    g = g.dropna(subset=['lat'])
    boats_out[meta['disp']] = dict(
        meta={k:v for k,v in meta.items() if k!='fin'} | {'fin': meta['fin']},
        t=[int(x.timestamp()) for x in g.index],
        lat=[round(float(v),4) for v in g['lat']], lon=[round(float(v),4) for v in g['lon']],
        dtf=[round(float(v),1) for v in g['dtf']], xte=[round(float(v),1) for v in g['xte']],
        sog=[None if np.isnan(v) else round(float(v),1) for v in g['sog']])
print("boats built:", len(boats_out), "| skipped (no track):", skipped)

milestones = list(range(600, -1, -20))
mil = {}
for name, meta in FEAT.items():
    if meta['tcf'] is None or name not in feat_series: continue
    fin_utc = pd.Timestamp(meta['fin']).tz_localize('UTC') + pd.Timedelta(hours=4)
    st = fin_utc - pd.Timedelta(seconds=parse_el(meta['el']))
    s = feat_series[name]; row=[]
    for m in milestones:
        hit = s[s['dtf'] <= m]
        row.append(round((hit['ts'].iloc[0]-st).total_seconds()*meta['tcf']) if len(hit) else None)
    mil[meta['disp']] = row

fleet = []
for bid, sub in df.groupby('boat_id'):
    nm = sub['boat_name'].iloc[0]
    sub = sub[sub['ts'] >= RACE_START].copy()
    if not len(sub): continue
    d = hav(sub['lat'], sub['lon'], *FIN)
    arr = sub[d.values < 0.7]
    if len(arr): sub = sub[sub['ts'] <= arr['ts'].iloc[0]]
    sub = sub.set_index('ts').resample('1h').first().dropna(subset=['lat'])
    if len(sub) < 5: continue
    fleet.append(dict(name=nm,
        t=[int(x.timestamp()) for x in sub.index],
        lat=[round(float(v),3) for v in sub['lat']], lon=[round(float(v),3) for v in sub['lon']]))

def ep(s): return int((pd.Timestamp(s).tz_localize('UTC')+pd.Timedelta(hours=4)).timestamp())
events = [
 dict(t=ep('2026-06-19 09:00'), cat='crew', label='Crew reduced 7 \u2192 5', txt='Francois and Iwona scratch (sickness/injury). Decision was actually confirmed earlier than this \u2014 pinned to Friday race-morning here so it doesn\u2019t sit off the left edge of the timeline.'),
 dict(t=ep('2026-06-19 12:58'), cat='milestone', label='Off the dock', txt='Departed for the start line. Final prep: dropped J1, raised and furled J3.'),
 dict(t=ep('2026-06-19 14:10'), cat='milestone', label='Warning signal', txt='Sequence 8 warning.'),
 dict(t=ep('2026-06-19 14:20'), cat='milestone', label='START', txt='Close-hauled beat in 20+ kts. Crew not yet in foulies \u2014 everyone soaked before the first watch change. Lesson logged early.'),
 dict(t=ep('2026-06-19 15:00'), cat='crew', label='Foulies, one by one', txt="Heavily heeled, crew went below individually to suit up. Brad's stomach turned from the extended time in the cabin."),
 dict(t=ep('2026-06-19 16:00'), cat='crew', label='Seasickness sets in', txt='Three of the crew feel the sea state Friday evening and are sailing through it \u2014 on deck, on watch, getting the job done, just not at their sharpest. Nobody had pre-medicated. A reminder that in fresh going the edge you lose to seasickness is comfort and precision, and that pre-race meds are cheap insurance.'),
 dict(t=ep('2026-06-19 20:00'), cat='crew', label='Evening watch settles in', txt='Hot burritos from the galley; ~20 kts, holding J3. First trick on the wheel for the newest offshore hand.'),
 dict(t=ep('2026-06-20 01:45'), cat='sail', label='All-hands: reef + Reacher', txt="15-minute debate (Reacher vs Code 0 vs A3 vs reef) settles on reef + Reacher. Darius up the mast to help reef; Darius and Brad on the foredeck for the Reacher. Hoist goes poorly \u2014 confusion over which side the halyard is on, what sheet runs over what. Coordination by yelling and relay. No maneuver card existed \u2014 the crew never fully assembled pre-race to build one. Lesson logged at the time: reef earlier, don't rush midnight all-hands changes."),
 dict(t=ep('2026-06-20 02:45'), cat='sail', label='New watch — J3 furled', txt='Brad + Steve on; Darius stays up the whole shift. Briefly double-headed J3 + Reacher; main kept overpowering so J3 comes off. Still overpowered but manageable.'),
 dict(t=ep('2026-06-20 06:00'), cat='crew', label='Watch extended an hour', txt='Sebastian and Matt still unwell; Brad + Steve cover an extra hour before being relieved.'),
 dict(t=ep('2026-06-20 10:30'), cat='sail', label='2nd reef (late, reactive)', txt='Main had been eased so far the first spreader chafed a visible mark into it before the reef went in. Brad up most of the day managing broaches \u2014 vang and main releases.'),
 dict(t=ep('2026-06-20 13:30'), cat='sail', label='Reacher sheet lost overboard', txt='No stopper knot on the sheet end \u2014 it ran. Forced a douse instead of a furl. 2nd reef + J3 finally finds a good balance.'),
 dict(t=ep('2026-06-20 17:21'), cat='milestone', label='GULF STREAM entry', txt="38\u00b010\u2032N 68\u00b044\u2032W, 74\u00b0F, 2 reefs + J3, ~8 kts. Logged as 16:21 but Steve's watch was running UTC\u22125 instead of UTC\u22124 \u2014 true time confirmed as 17:21 EDT (0.7 nm match on the tracker)."),
 dict(t=ep('2026-06-20 16:45'), cat='crew', label='Brad drives 10-ft waves', txt='Two hours on the wheel in the biggest sea state of the race.'),
 dict(t=ep('2026-06-20 18:30'), cat='sail', label='Shook 2nd reef', txt='Brad on the wheel, Darius on the mast, Steve in the pit.'),
 dict(t=ep('2026-06-20 19:00'), cat='crew', label='Freeze-dried dinner', txt='Chicken pesto pasta \u2014 too much water, tasted like chicken noodle soup. "Was ok."'),
 dict(t=ep('2026-06-20 21:00'), cat='milestone', label='Stream core, 80°F', txt='9.7 kts logged at 22:42 \u2014 favorable current, wind behind, best speeds of the race.'),
 dict(t=ep('2026-06-20 23:00'), cat='crew', label='Back on, driving 1.5 hrs', txt='Similar conditions to the evening watch.'),
 dict(t=ep('2026-06-21 01:00'), cat='systems', label='BATTERY BLACKOUT', txt='House bank dead; full instrument outage ~10 min. Brad steering by the stars. Engine charge; daily charging thereafter, but no formal schedule.'),
 dict(t=ep('2026-06-21 05:00'), cat='sail', label='A3 up', txt='Brad on the foredeck, coached by Steve on the pit; Sebastian driving, Matt assisting bow. Reminders needed on the spin-halyard untangle and the tackline set for the inside jibe.'),
 dict(t=ep('2026-06-21 05:01'), cat='milestone', label='South of the Stream', txt="75\u00b0F at 36\u00b051\u2032N \u2014 crossing complete in ~8\u201312 hrs, on plan. Anticlimactic, i.e. nailed."),
 dict(t=ep('2026-06-21 09:00'), cat='sail', label='A3 down — big left shift', txt='Wind swings 300\u2192210. The race turns into an upwind beat from here to Bermuda.'),
 dict(t=ep('2026-06-21 12:00'), cat='crew', label='Recovery window', txt='A calm midday stretch \u2014 rest, drying gear, cleanup. Rest banked here mattered later (see the light-air doctrine).'),
 dict(t=ep('2026-06-21 18:00'), cat='systems', label='Satcomm: GRIBs yes, phone finicky', txt='The Iridium GO! pulled GRIB weather files for the navigators most of the time \u2014 but getting it working was painful and pulled Steve off other jobs more than once. On Brad\u2019s phone, only one messaging app would connect. Worth drilling the whole satcomm workflow, and every app, before the start.'),
 dict(t=ep('2026-06-21 19:30'), cat='tactics', label='Wind dying', txt="The forecast \u201cwall of little wind\u201d south of 36\u00b0N arrives. Under 5 kts by late watch; Brad drives ~2 hrs. Still east of rhumb; EU model calls for a midnight tack."),
 dict(t=ep('2026-06-22 01:40'), cat='tactics', label='Tack to port — back to rhumb', txt='Shift 200\u2013240 \u2192 140\u2013170. Optimism aboard \u2014 mid-fleet among boats considered faster.'),
 dict(t=ep('2026-06-22 01:45'), cat='sail', label='Leech tear noticed', txt='Upper leech of the mainsail found tearing. Steve suspects flogging plus reef-induced chafe.'),
 dict(t=ep('2026-06-22 02:45'), cat='systems', label='SPEEDO FAILS', txt='Boatspeed reads zero or garbage \u2014 every derived true-wind number goes with it. 03:00: Brad strips the displays to AWA + SOG only. "Now we\'re dinghy sailing."'),
 dict(t=ep('2026-06-22 04:30'), cat='sail', label='Stay with J3 over J1', txt='Considered the J1 for the light air; stuck with J3 \u2014 same size, rougher shape reasoned to hold better in the leftover chop.'),
 dict(t=ep('2026-06-22 08:00'), cat='sail', label='Mainsail leech patch', txt='~1 hr repair, Steve driving under jib alone at 2.5 kts SOG. Steve has not slept to keep the boat moving.'),
 dict(t=ep('2026-06-22 09:00'), cat='sail', label='J3 → J1', txt='Clean change, Brad on the foredeck. Light-air inventory call for the beat.'),
 dict(t=ep('2026-06-22 10:00'), cat='crew', label='Breakfast + galley rhythm', txt='Hot breakfast; dishes done with a seawater bucket \u2014 the routine smoothing out by day four.'),
 dict(t=ep('2026-06-22 11:15'), cat='crew', label='Dolphins + birds', txt='So many of them, with birds working the same water.'),
 dict(t=ep('2026-06-22 11:45'), cat='systems', label='BSP returns', txt='Display fallback profiles built, including a no-BSP backup, plus helm hot-keys.'),
 dict(t=ep('2026-06-22 12:00'), cat='crew', label='Humpback dead ahead', txt='Near-miss \u2014 could have hit it. Wind building.'),
 dict(t=ep('2026-06-22 14:00'), cat='tactics', label='Three-way helm split', txt='130 nm to go, Bermuda just below layline. VMG (Sebastian) vs boat speed (Darius) vs layline (Steve) \u2014 helm rotates, each sails their own idea. Fleet visibly sailing higher.'),
 dict(t=ep('2026-06-22 16:45'), cat='tactics', label='Steve takes the layline', txt='Steve back on the helm after rest, commits to the layline. Faster-looking boats cross to windward.'),
 dict(t=ep('2026-06-22 20:30'), cat='tactics', label='Parked, 3 kts — tack to port', txt="Sebastian tacks; Steve disagrees, wants to hold near rhumb. 20:40: an unexpected SE'ly (150\u00b0T) straight from Bermuda arrives \u2014 the tack pays a little, against the forecast."),
 dict(t=ep('2026-06-22 23:00'), cat='crew', label='Fog, rebuild, an hour on the wheel', txt='Wind rebuilds 6\u219211+ kts; confused chop, thick fog, no visibility beyond nearby boats, very humid. "Like driving a race car" \u2014 stable enough to hold with one hand at times.'),
 dict(t=ep('2026-06-23 05:45'), cat='tactics', label='Shift to 210 — layline made', txt='"Right on the money for a finish on the layline."'),
 dict(t=ep('2026-06-23 11:00'), cat='tactics', label='Finish prep begins', txt='Very shifty conditions; Steve navigating multiple tacks into the approach.'),
 dict(t=ep('2026-06-23 13:00'), cat='tactics', label='The wind cloud', txt='Missed going under a wind cloud in the final hours \u2014 cost a few miles, ~28th \u2192 39th provisional.'),
 dict(t=ep('2026-06-23 15:54'), cat='milestone', label='FINISH', txt='15:54:52 EDT. Elapsed 4d 01:34:52. 46th/86 SDL Overall, 8th/10 SDL 3 \u2014 up from 71st/99 in 2022.'),
]

# ── Insight annotations (v5): analysis findings pinned to the moment they describe ──
events += [
 dict(t=ep('2026-06-20 03:30'), cat='insight', label='INSIGHT · The cost of chaos', txt='Tracker analysis: RAGANA bled roughly 90\u2013130 minutes to her rating twin Christopher Dragon across Friday night and Saturday \u2014 the window containing the un-carded 01:45 all-hands change, reactive reefs, and a lost sheet. Against the eventual class winner Gesture, most of the final deficit accrued here, not in the light air.'),
 dict(t=ep('2026-06-21 14:00'), cat='insight', label='INSIGHT · The Sunday beat paid', txt='From roughly 265 nm to 180 nm to go, RAGANA\u2019s east lane gained ~20 minutes per 10 nm on Christopher Dragon\u2019s west lane \u2014 continuously, for 80 nm \u2014 flipping a 94-minute deficit into a 75-minute lead by 22:13 Sunday. Upwind in 8\u201311 kts of flat water is this boat\u2019s design sweet spot.'),
 dict(t=ep('2026-06-22 06:00'), cat='insight', label='INSIGHT · Everyone parked', txt='Fair-metric finding: measured over the same stretch of ocean (180\u219280 nm to go), every boat in the comparison set parked \u2014 16\u201338% of each traversal under 4 kts. The spread between best and worst traversal was only 5.5 hours. RAGANA\u2019s 27.9 h was second-slowest: an honest penalty of ~2\u20134 hours vs peers, from the most-east lane, with a speedo failure and a sail repair falling inside the dead core.'),
 dict(t=ep('2026-06-22 18:00'), cat='insight', label='INSIGHT · Position × timing', txt='Within the cohort entering the light-air zone the same evening, boats nearer the rhumb line traversed it 1.5\u20134 hours faster (Carina: same entry hour, ~10 nm further west, 3.7 h quicker). Yet the overall podium \u2014 Nicole, Selkie, Towhee \u2014 won from the east: as lower-rated boats they arrived 3\u20135 hours later, when the Monday-evening rebuild was closer. Lane choice and arrival timing both mattered.'),
 dict(t=ep('2026-06-23 09:00'), cat='insight', label='INSIGHT · The near-catch', txt='RAGANA closed Hissy Fit II (J/120) from 159 minutes behind at 400 nm to go to just 9 minutes at 20 nm to go \u2014 and lost to her by 2m15s corrected. The back half of this race was sailed well.'),
]
CAT_Z = {'crew':0,'systems':1,'sail':2,'tactics':3,'insight':4,'milestone':5}
events.sort(key=lambda e: (e['t'], CAT_Z.get(e['cat'],0)))

def sp(a,b): return [ep(a), ep(b)]
watches = [sp('2026-06-19 20:00','2026-06-19 23:00'), sp('2026-06-20 02:45','2026-06-20 07:00'),
 sp('2026-06-20 13:30','2026-06-20 19:00'), sp('2026-06-20 23:00','2026-06-21 02:00'),
 sp('2026-06-21 05:00','2026-06-21 08:00'), sp('2026-06-21 19:30','2026-06-21 23:00'),
 sp('2026-06-22 01:40','2026-06-22 05:00'), sp('2026-06-22 08:00','2026-06-22 12:30'),
 sp('2026-06-22 23:00','2026-06-23 02:15'), sp('2026-06-23 05:00','2026-06-23 08:00'),
 sp('2026-06-23 11:00','2026-06-23 15:55')]

# Steve's log reconciliation. The 09:00 row was re-attempted (digit transpositions, DM/DD,
# whole-degree shifts) and could not be resolved below ~12 nm with any single-cause fix — deleted.
LOG = [
 ('Fri 15:50', '2026-06-19 15:50', 41,19, 71,16, '8.2', '154°M', '14–20 kts / 240°', None,
  'match', 'Log dated "Sat" — race started Fri 14:20, this is Friday afternoon.'),
 ('Fri 21:16', '2026-06-19 21:16', 40,39.6, 70,43.7, '~9.0–8.5', '155°M', '14–17 kts / 257°M', 64,
  'match', 'Same date mislabel as above — Friday evening, not Saturday.'),
 ('Sat 01:55', '2026-06-20 01:55', 40,5, 70,19, '8.5–9', '290°M', '14–18 kts', 70,
  'match', ''),
 ('Sat 05:20', '2026-06-20 05:20', 39,39, 70,1, '9–11', '290°M', '20s, gusting 27', 63,
  'match', ''),
 ('Sat 11:57', '2026-06-20 12:57', 38,45, 69,13, '8–10', '—', '22 kts', 72,
  'warn', "CONFIRMED \u2014 Steve's watch (and some boat instruments) were running UTC\u22125 (EST) instead of UTC\u22124 (EDT), i.e. exactly 1 hr slow. True EDT = logged time + 1 hr = 12:57, matching the tracker within 0.6 nm (vs. 9.6 nm off at the literal 11:57). Bermuda Race official timing is UTC\u22124 throughout \u2014 the instrument was simply on the wrong zone."),
 ('Sat 16:21', '2026-06-20 17:21', 38,10, 68,44, '8 (2 reefs+J3)', '—', 'entering Gulf Stream', 74,
  'warn', 'CONFIRMED \u2014 same UTC\u22125-instead-of-UTC\u22124 instrument error as the row above. True EDT = 17:21, matching the tracker within 0.7 nm (vs. 9.7 nm off at the literal 16:21). Gulf Stream entry was actually ~17:21, about an hour later than the log\u2019s face value.'),
 ('Sat 21:00', '2026-06-20 21:00', 37,42, 68,16, '~8.5', '155°M', '16–20 kts / 310°M', 80,
  'match', ''),
 ('Sat 22:42', '2026-06-20 22:42', 37,27, 68,5, '9.7', '154°M', '— (word unclear, reads "Kevin")', 80,
  'match', 'Wind/notes field has an illegible word transcribed as "Kevin" — unclear meaning, quoted as written.'),
 ('Sun 05:01', '2026-06-21 05:01', 36,51, 67,20, '7', '262°M', '13 kts', 75,
  'match', 'South of the Stream.'),
 ('Sun 08:47', '2026-06-21 08:47', 36,32, 67,1, '6.15', '—', '—', None,
  'match', ''),
]
rag = feat_series['Ragana']
recon = []
for lbl, tstr, ld,lm,gd,gm, speed, course, wind, temp, verdict, note in LOG:
    la, lo = ld+lm/60, -(gd+gm/60)
    tt = pd.Timestamp(tstr, tz='UTC') + pd.Timedelta(hours=4)
    i = (rag['ts']-tt).abs().idxmin(); r = rag.loc[i]
    dnm = float(hav(la,lo,r['lat'],r['lon']))
    recon.append(dict(t=lbl, matched_edt=tstr[11:], temp=temp, speed=speed, course=course, wind=wind,
        log=[round(la,3),round(lo,3)], trk=[round(float(r['lat']),3),round(float(r['lon']),3)],
        d=round(dnm,1), verdict=verdict, note=note))

rs = feat_series['Ragana']
hop = hav(rs['lat'].shift(), rs['lon'].shift(), rs['lat'], rs['lon']).fillna(0)
dist_sailed = float(hop.sum())
sogv = rs['sog'].dropna()
stats = dict(
 dist_sailed=round(dist_sailed,1), rhumb=635.1, extra=round(dist_sailed-635.1,1),
 avg_sog=round(float(sogv.mean()),2), max_sog=round(float(sogv.max()),1),
 pct_under3=round(float((sogv<3).mean()*100),1), pct_under5=round(float((sogv<5).mean()*100),1),
 max_xte_e=round(float(rs['xte'].max()),1), max_xte_w=round(float(rs['xte'].min()),1))
print(stats)


# ── Fair park metric: each boat's own traversal of DTF 180->80 (the empirically slow zone; fleet-median
#    SOG bottoms at 3.3 kts in the 140-160 band). Replaces the flawed fixed-wall-clock window that made
#    Gemini II look immune (she parked at 0.6 kts Mon ~07:00, before the old window opened).
def _hit(s, m):
    sub = s[s['dtf'] <= m]
    return sub['ts'].iloc[0] if len(sub) else None
parkFair = {}
for name, meta in FEAT.items():
    if name not in feat_series: continue
    s = feat_series[name]
    t0, t1 = _hit(s,180), _hit(s,80)
    if t0 is None or t1 is None: continue
    seg = s[(s['ts']>=t0)&(s['ts']<=t1)].dropna(subset=['sog'])
    if not len(seg): continue
    parkFair[meta['disp']] = dict(
        enter=int(t0.timestamp()), hrs=round((t1-t0).total_seconds()/3600,1),
        mean=round(float(seg['sog'].mean()),1),
        u4=round(100*float((seg['sog']<4).mean())),
        u2=round(100*float((seg['sog']<2).mean())),
        xte=round(float(seg['xte'].mean()),1))
data = dict(boats=boats_out, fleet=fleet, mil=dict(milestones=milestones, series=mil), parkFair=parkFair,
            events=events, watches=watches, recon=recon, stats=stats,
            start=START, fin=FIN, meta=dict(generated='2026-07-05', tz='EDT (UTC-4)'))
with open('/home/claude/dashboard_data.json','w') as f:
    json.dump(data, f, separators=(',',':'))
import os
print('json size MB:', round(os.path.getsize('/home/claude/dashboard_data.json')/1e6,2))
print('boats:', len(boats_out), '| fleet tracks:', len(fleet), '| events:', len(events))
