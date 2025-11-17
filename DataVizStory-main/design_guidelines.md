# Design Guidelines: Data Analysis & Visualization Platform

## Design Approach
**System-Based with Analytics Inspiration**: Material Design principles adapted for data-heavy applications, drawing inspiration from Tableau, Observable, and Linear's clean productivity aesthetic. Focus on clarity, scanability, and efficient data presentation.

## Core Design Elements

### Typography
- **Primary Font**: Inter via Google Fonts (excellent for data and UI)
- **Monospace**: JetBrains Mono for data tables and code snippets
- **Hierarchy**:
  - Page titles: text-4xl font-bold
  - Section headers: text-2xl font-semibold
  - Card titles: text-lg font-medium
  - Body text: text-base font-normal
  - Data labels: text-sm font-medium
  - Table content: text-sm

### Layout System
**Tailwind Spacing Units**: Consistently use 4, 6, 8, 12, 16, 24 for a cohesive rhythm
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-16
- Card gaps: gap-6
- Content containers: max-w-7xl mx-auto px-6

### Component Library

**Navigation**
- Top navbar: Fixed position with py-4, containing logo, main navigation links, and user profile
- Breadcrumb trail below navbar for deep navigation context

**Upload Zone**
- Large, prominent drag-and-drop area (min-h-64) with dashed border
- Center-aligned icon, heading, and file format list
- File type badges showing supported formats (.csv, .xlsx, .json)
- Browse button as alternative to drag-drop

**Data Preview Table**
- Fixed header with sticky positioning
- Alternating row treatment for scanability
- Column headers with sort indicators
- Row height: h-12 for comfortable reading
- Horizontal scroll for wide datasets with visible scrollbar
- Compact mode toggle for dense data viewing

**Visualization Cards**
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Each card: rounded-lg border with p-6
- Card header: Chart title, type badge, export button
- Chart area: min-h-80 for adequate visualization space
- Chart controls: Subtle toolbar for chart type switching

**AI Summary Panel**
- Prominent placement above visualizations dashboard
- Highlighted container with distinct border treatment
- Icon indicating AI-generated content
- Structured sections: Key Insights (bullet points), Data Story (narrative paragraph), Recommendations
- Expandable/collapsible for space management

**Dashboard Layout**
- Two-column layout: 2/3 visualizations, 1/3 insights panel on desktop
- Stack to single column on mobile
- Filter sidebar (collapsible): w-64 with data column filters and date range pickers

**Empty States**
- Centered content with large icon (w-24 h-24)
- Clear instructional text guiding next steps
- Primary action button prominently displayed

**Loading States**
- Skeleton screens matching final content structure
- Progress indicators for file upload and analysis phases
- Percentage completion for data processing

### Animations
**Minimal & Purposeful**:
- File upload: Smooth slide-in of processing status
- Chart rendering: Subtle fade-in (duration-300)
- Card interactions: Gentle scale on hover (scale-105 transition-transform)
- NO auto-playing chart animations or scroll effects

### Icons
**Heroicons** via CDN for:
- Upload: cloud-arrow-up
- Charts: chart-bar, chart-pie
- AI: sparkles
- Export: arrow-down-tray
- Data: table-cells

## Images

**Hero Section Image**: 
Use an abstract data visualization or dashboard mockup showing colorful charts and graphs. The image should be professional, modern, and suggest analytical capability. Place as background with overlay treatment (min-h-96 on desktop, min-h-64 on mobile). Include heading and upload CTA button with blurred background (backdrop-blur-md) over the hero image.

**Empty State Illustrations**: 
Simple, friendly illustrations for "no data uploaded" and "no visualizations generated" states - these can be SVG graphics or placeholder images suggesting analytics themes.

## Page Structure

**Landing/Upload Page**:
- Hero section with platform value proposition over image
- Upload zone immediately below hero
- Three-column feature grid showcasing: "Automatic Visualization", "AI Insights", "Multi-format Support"
- Example visualization carousel showing sample outputs

**Analysis Dashboard**:
- Top: Breadcrumb + file name + metadata (rows, columns, file size)
- AI Summary panel (full-width, prominent)
- Visualization grid (responsive columns)
- Data table at bottom (collapsible, full-width)

**Accessibility**
- Sufficient contrast in all data visualizations
- Keyboard navigation through all interactive elements
- ARIA labels on chart elements
- Focus indicators on all controls (ring-2 ring-offset-2)