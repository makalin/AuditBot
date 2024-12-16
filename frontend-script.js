// State management
let selectedFiles = new Set();
let currentFiles = [];
let totalSize = 0;

// Event Handlers
document.getElementById('scanBtn').addEventListener('click', async () => {
  try {
    // In a real app, you might want to show a directory picker
    // For demo, we'll use a hardcoded path
    const result = await ipcRenderer.invoke('start-scan', process.cwd());
    updateDashboard(result);
    updateFileList(result.files);
  } catch (error) {
    console.error('Scan failed:', error);
    // Add error handling UI here
  }
});

document.getElementById('selectAll').addEventListener('change', (e) => {
  const checked = e.target.checked;
  document.querySelectorAll('#fileList input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = checked;
    const filePath = checkbox.getAttribute('data-path');
    if (checked) {
      selectedFiles.add(filePath);
    } else {
      selectedFiles.delete(filePath);
    }
  });
  updateCleanupButton();
});

document.getElementById('showDuplicates').addEventListener('click', () => {
  const filteredFiles = currentFiles.filter(file => file.is_duplicate);
  updateFileList(filteredFiles);
});

document.getElementById('showUnused').addEventListener('click', () => {
  const filteredFiles = currentFiles.filter(file => {
    const lastAccessed = new Date(file.last_accessed);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return lastAccessed < ninetyDaysAgo;
  });
  updateFileList(filteredFiles);
});

document.getElementById('showCache').addEventListener('click', () => {
  const cachePatterns = [/\.cache$/i, /\.tmp$/i, /\.temp$/i, /thumbs\.db$/i, /\.log$/i];
  const filteredFiles = currentFiles.filter(file => 
    cachePatterns.some(pattern => pattern.test(file.path))
  );
  updateFileList(filteredFiles);
});

document.getElementById('cleanupBtn').addEventListener('click', async () => {
  if (selectedFiles.size === 0) return;
  
  if (confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) {
    try {
      const results = await ipcRenderer.invoke('cleanup-files', Array.from(selectedFiles));
      const successCount = results.filter(r => r.success).length;
      alert(`Successfully deleted ${successCount} files`);
      
      // Refresh the file list
      const remainingFiles = currentFiles.filter(file => 
        !selectedFiles.has(file.path) || results.find(r => r.path === file.path && !r.success)
      );
      updateFileList(remainingFiles);
      selectedFiles.clear();
      updateCleanupButton();
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Failed to cleanup files. Please try again.');
    }
  }
});

// UI Update Functions
function updateDashboard(result) {
  currentFiles = result.files;
  totalSize = result.totalSize;
  
  document.getElementById('totalFiles').textContent = result.files.length;
  document.getElementById('totalSize').textContent = formatSize(result.totalSize);
  document.getElementById('duplicatesFound').textContent = result.duplicateCount;
  
  const spaceSaved = result.files
    .filter(f => f.is_duplicate)
    .reduce((acc, f) => acc + f.size, 0);
  document.getElementById('spaceSavings').textContent = formatSize(spaceSaved);
  
  createFileTypeChart(result.filesByType);
}

function updateFileList(files) {
  const tbody = document.getElementById('fileList');
  tbody.innerHTML = '';
  
  files.forEach(file => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <input type="checkbox" class="rounded" data-path="${file.path}"
          ${selectedFiles.has(file.path) ? 'checked' : ''}>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${file.path}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${formatSize(file.size)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${formatDate(file.last_accessed)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${file.file_type || 'unknown'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${getStatusClass(file)}">
          ${getStatusText(file)}
        </span>
      </td>
    `;
    
    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedFiles.add(file.path);
      } else {
        selectedFiles.delete(file.path);
      }
      updateCleanupButton();
    });
    
    tbody.appendChild(row);
  });
}

function updateCleanupButton() {
  const cleanupBtn = document.getElementById('cleanupBtn');
  cleanupBtn.disabled = selectedFiles.size === 0;
}

function getStatusClass(file) {
  if (file.is_duplicate) return 'bg-red-100 text-red-800';
  if (isUnused(file.last_accessed)) return 'bg-yellow-100 text-yellow-800';
  if (isCacheFile(file.path)) return 'bg-purple-100 text-purple-800';
  return 'bg-green-100 text-green-800';
}

function getStatusText(file) {
  if (file.is_duplicate) return 'Duplicate';
  if (isUnused(file.last_accessed)) return 'Unused';
  if (isCacheFile(file.path)) return 'Cache';
  return 'Active';
}

function isCacheFile(filePath) {
  const cachePatterns = [/\.cache$/i, /\.tmp$/i, /\.temp$/i, /thumbs\.db$/i, /\.log$/i];
  return cachePatterns.some(pattern => pattern.test(filePath));
}

function isUnused(lastAccessed) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return new Date(lastAccessed) < ninetyDaysAgo;
}

// Utility function to format file sizes
function formatSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Utility function to format dates
function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

// Create D3.js pie chart for file type distribution
function createFileTypeChart(data) {
  const width = 400;
  const height = 250;
  const radius = Math.min(width, height) / 2;

  // Clear previous chart
  d3.select("#fileTypeChart").selectAll("*").remove();

  const svg = d3.select("#fileTypeChart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .append("g")
    .attr("transform", `translate(${width/2},${height/2})`);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const pie = d3.pie()
    .sort(null)
    .value(d => d.value.size);

  const arc = d3.arc()
    .innerRadius(radius * 0.4)
    .outerRadius(radius * 0.8);

  const arcs = svg.selectAll("arc")
    .data(pie(Object.entries(data)))
    .enter()
    .append("g")
    .attr("class", "arc");

  // Add hover tooltip
  const tooltip = d3.select("#fileTypeChart")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("padding", "5px")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px");

  // Add paths with hover effects
  arcs.append("path")
    .attr("d", arc)
    .attr("fill", d => color(d.data[0]))
    .on("mouseover", function(event, d) {
      d3.select(this).style("opacity", 0.8);
      tooltip
        .style("visibility", "visible")
        .html(`${d.data[0]}<br>${formatSize(d.data[1].size)}<br>${(d.data[1].size / totalSize * 100).toFixed(1)}%`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).style("opacity", 1);
      tooltip.style("visibility", "hidden");
    });

  // Add labels for segments > 5%
  arcs.append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .text(d => {
      const percentage = (d.data[1].size / totalSize * 100).toFixed(1);
      return percentage > 5 ? `${d.data[0]}` : '';
    })
    .style("font-size", "12px")
    .style("fill", "white");
}

// Filter function to handle search and filtering of files
function filterFiles(searchTerm = '') {
  const searchLower = searchTerm.toLowerCase();
  return currentFiles.filter(file => {
    const matchesSearch = !searchTerm || file.path.toLowerCase().includes(searchLower);
    const matchesActiveFilter = window.activeFilter === 'all' ||
      (window.activeFilter === 'duplicates' && file.is_duplicate) ||
      (window.activeFilter === 'unused' && isUnused(file.last_accessed)) ||
      (window.activeFilter === 'cache' && isCacheFile(file.path));
    return matchesSearch && matchesActiveFilter;
  });
}


// Add these to the event handlers section in frontend-script.js

// Initialize the active filter
window.activeFilter = 'all';

// Search input handler with debouncing
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const filteredFiles = filterFiles(e.target.value);
    updateFileList(filteredFiles);
  }, 300);
});

// Filter select handler
document.getElementById('filterSelect').addEventListener('change', (e) => {
  window.activeFilter = e.target.value;
  const searchTerm = document.getElementById('searchInput').value;
  const filteredFiles = filterFiles(searchTerm);
  updateFileList(filteredFiles);
});

// Enhance existing filter button handlers
document.getElementById('showDuplicates').addEventListener('click', () => {
  window.activeFilter = 'duplicates';
  document.getElementById('filterSelect').value = 'duplicates';
  const searchTerm = document.getElementById('searchInput').value;
  const filteredFiles = filterFiles(searchTerm);
  updateFileList(filteredFiles);
});

document.getElementById('showUnused').addEventListener('click', () => {
  window.activeFilter = 'unused';
  document.getElementById('filterSelect').value = 'unused';
  const searchTerm = document.getElementById('searchInput').value;
  const filteredFiles = filterFiles(searchTerm);
  updateFileList(filteredFiles);
});

document.getElementById('showCache').addEventListener('click', () => {
  window.activeFilter = 'cache';
  document.getElementById('filterSelect').value = 'cache';
  const searchTerm = document.getElementById('searchInput').value;
  const filteredFiles = filterFiles(searchTerm);
  updateFileList(filteredFiles);
});
