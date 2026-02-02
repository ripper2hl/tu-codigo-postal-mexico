---
layout: page
title: Novedades
include_in_header: true
---

# Novedades

{% if site.latest_changes and site.latest_changes != "" %}
### De Google Play
{{ site.latest_changes | markdownify }}
{% else %}
Aquí encontrarás el historial de cambios de la aplicación.
{% endif %}