#!/usr/bin/env python3
"""Inject dashboard_data.json into dashboard_template.html -> ragana_nb2026_dashboard.html"""
data = open('dashboard_data.json').read().replace('</', '<\\/')
tpl = open('dashboard_template.html').read()
open('ragana_nb2026_dashboard.html', 'w').write(tpl.replace('__DATA__', data))
print('assembled ragana_nb2026_dashboard.html')
