(function() {
  'use strict';

  const STORAGE_KEY = 'carbonFootprintRecords';
  const NATIONAL_AVERAGE_DAILY = 19.2;

  const CATEGORIES = [
    { name: '交通', color: '#1976D2' },
    { name: '饮食', color: '#F57C00' },
    { name: '能源', color: '#FBC02D' },
    { name: '购物', color: '#7B1FA2' },
    { name: '其他', color: '#607D8B' }
  ];

  const StorageManager = {
    getRecords() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('读取记录失败:', e);
        return [];
      }
    },

    saveRecord(record) {
      const records = this.getRecords();
      records.push(record);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return records;
    },

    deleteRecord(id) {
      const records = this.getRecords();
      const filtered = records.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return filtered;
    }
  };

  const UI = {
    elements: {},

    init() {
      this.elements = {
        carbonForm: document.getElementById('carbonForm'),
        category: document.getElementById('category'),
        action: document.getElementById('action'),
        emission: document.getElementById('emission'),
        date: document.getElementById('date'),
        monthlyTotal: document.getElementById('monthlyTotal'),
        dailyAverage: document.getElementById('dailyAverage'),
        personalBar: document.getElementById('personalBar'),
        comparisonResult: document.getElementById('comparisonResult'),
        carbonChart: document.getElementById('carbonChart'),
        emptyChart: document.getElementById('emptyChart'),
        chartLegend: document.getElementById('chartLegend'),
        historyList: document.getElementById('historyList'),
        recordCount: document.getElementById('recordCount'),
        toast: document.getElementById('toast')
      };
    },

    showToast(message, type = 'info') {
      const { toast } = this.elements;
      toast.textContent = message;
      toast.className = `toast show ${type}`;
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2500);
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },

    getCategoryColor(categoryName) {
      const category = CATEGORIES.find(c => c.name === categoryName);
      return category ? category.color : '#607D8B';
    }
  };

  const Statistics = {
    getMonthlyTotal(records) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      return records
        .filter(r => {
          const date = new Date(r.date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, r) => sum + r.emission_kg, 0);
    },

    getDailyAverage(records) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyRecords = records.filter(r => {
        const date = new Date(r.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      if (monthlyRecords.length === 0) return 0;

      const uniqueDays = new Set(monthlyRecords.map(r => r.date));
      const total = monthlyRecords.reduce((sum, r) => sum + r.emission_kg, 0);

      return total / uniqueDays.size;
    },

    compareWithNational(dailyAverage) {
      if (dailyAverage === 0) return { ratio: 0, level: 'none' };

      const ratio = (dailyAverage / NATIONAL_AVERAGE_DAILY) * 100;
      let level;

      if (ratio < 70) {
        level = 'good';
      } else if (ratio < 110) {
        level = 'warning';
      } else {
        level = 'high';
      }

      return { ratio, level };
    },

    get30DaysData(records) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysData = [];

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayRecords = records.filter(r => r.date === dateStr);

        const categoryData = {};
        CATEGORIES.forEach(cat => {
          categoryData[cat.name] = dayRecords
            .filter(r => r.category === cat.name)
            .reduce((sum, r) => sum + r.emission_kg, 0);
        });

        daysData.push({
          date: dateStr,
          categories: categoryData,
          total: dayRecords.reduce((sum, r) => sum + r.emission_kg, 0)
        });
      }

      return daysData;
    }
  };

  const FormHandler = {
    init() {
      this.setDefaultDate();
      this.bindFormSubmit();
    },

    setDefaultDate() {
      const today = new Date().toISOString().split('T')[0];
      UI.elements.date.value = today;
    },

    bindFormSubmit() {
      UI.elements.carbonForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    },

    handleSubmit() {
      const formData = {
        id: Date.now().toString(),
        category: UI.elements.category.value,
        action: UI.elements.action.value.trim(),
        emission_kg: parseFloat(UI.elements.emission.value),
        date: UI.elements.date.value,
        created_at: Date.now()
      };

      if (!this.validate(formData)) {
        return;
      }

      StorageManager.saveRecord(formData);
      UI.showToast('记录保存成功！🌱', 'success');
      this.resetForm();
      CarbonApp.refresh();
    },

    validate(data) {
      if (!data.category) {
        UI.showToast('请选择排放类别', 'error');
        return false;
      }
      const validCategories = CATEGORIES.map(c => c.name);
      if (!validCategories.includes(data.category)) {
        UI.showToast('请选择有效的排放类别', 'error');
        return false;
      }
      if (!data.action) {
        UI.showToast('请输入具体行为描述', 'error');
        return false;
      }
      if (isNaN(data.emission_kg) || data.emission_kg <= 0) {
        UI.showToast('碳排放量必须大于0', 'error');
        return false;
      }
      if (data.emission_kg > 1000) {
        UI.showToast('碳排放量不能超过1000kg', 'error');
        return false;
      }
      if (!data.date) {
        UI.showToast('请选择日期', 'error');
        return false;
      }
      return true;
    },

    resetForm() {
      UI.elements.category.value = '';
      UI.elements.action.value = '';
      UI.elements.emission.value = 1;
      this.setDefaultDate();
      UI.elements.category.focus();
    }
  };

  const ChartRenderer = {
    animationFrame: null,

    init() {
      window.addEventListener('resize', () => this.render());
      this.renderLegend();
    },

    renderLegend() {
      UI.elements.chartLegend.innerHTML = CATEGORIES.map(cat => `
        <div class="legend-item">
          <span class="legend-color" style="background: ${cat.color}"></span>
          <span>${cat.name}</span>
        </div>
      `).join('');
    },

    render() {
      const records = StorageManager.getRecords();
      const daysData = Statistics.get30DaysData(records);

      const hasData = daysData.some(d => d.total > 0);

      if (!hasData) {
        UI.elements.emptyChart.style.display = 'block';
        return;
      }

      UI.elements.emptyChart.style.display = 'none';

      const canvas = UI.elements.carbonChart;
      const ctx = canvas.getContext('2d');

      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const padding = { top: 30, right: 20, bottom: 50, left: 50 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      const maxValue = Math.max(...daysData.map(d => d.total));
      const maxY = Math.ceil(maxValue / 5) * 5 || 10;

      this.drawGrid(ctx, padding, chartWidth, chartHeight, maxY);
      this.drawAxes(ctx, padding, chartWidth, chartHeight, maxY);
      this.drawStackedBars(ctx, daysData, padding, chartWidth, chartHeight, maxY);
      this.drawDateLabels(ctx, daysData, padding, chartWidth, chartHeight);
    },

    drawGrid(ctx, padding, width, height, maxY) {
      ctx.strokeStyle = 'rgba(46, 125, 50, 0.08)';
      ctx.lineWidth = 1;

      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const y = padding.top + (height / ySteps) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + width, y);
        ctx.stroke();
      }
    },

    drawAxes(ctx, padding, width, height, maxY) {
      ctx.strokeStyle = 'rgba(46, 125, 50, 0.3)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + height);
      ctx.lineTo(padding.left + width, padding.top + height);
      ctx.stroke();

      ctx.fillStyle = '#2E7D32';
      ctx.font = '11px Lato, sans-serif';
      ctx.textAlign = 'right';

      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const y = padding.top + (height / ySteps) * i;
        const value = maxY - (maxY / ySteps) * i;
        ctx.fillText(value.toFixed(0), padding.left - 8, y + 4);
      }

      ctx.textAlign = 'center';
      ctx.fillText('kg CO₂', padding.left - 30, padding.top - 10);
    },

    drawStackedBars(ctx, daysData, padding, width, height, maxY) {
      const barWidth = (width / daysData.length) * 0.7;
      const gap = (width / daysData.length) * 0.3;

      daysData.forEach((day, dayIndex) => {
        const x = padding.left + (width / daysData.length) * dayIndex + gap / 2;
        let yOffset = 0;

        CATEGORIES.forEach(cat => {
          const value = day.categories[cat.name];
          const barHeight = (value / maxY) * height;

          if (value > 0) {
            const y = padding.top + height - barHeight - yOffset;

            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, cat.color);
            gradient.addColorStop(1, this.adjustColor(cat.color, -30));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();
          }

          yOffset += barHeight;
        });
      });
    },

    drawDateLabels(ctx, daysData, padding, width, height) {
      ctx.fillStyle = '#388E3C';
      ctx.font = '10px Lato, sans-serif';
      ctx.textAlign = 'center';

      const step = Math.ceil(daysData.length / 6);

      daysData.forEach((day, i) => {
        if (i % step !== 0 && i !== daysData.length - 1) return;

        const x = padding.left + (width / daysData.length) * i + (width / daysData.length) / 2;
        const date = new Date(day.date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;

        ctx.fillText(label, x, padding.top + height + 20);
      });
    },

    adjustColor(color, amount) {
      const hex = color.replace('#', '');
      const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
      const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
      const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  };

  const HistoryList = {
    render() {
      let records = StorageManager.getRecords();
      records = records.sort((a, b) => new Date(b.date) - new Date(a.date) || b.created_at - a.created_at);

      UI.elements.recordCount.textContent = records.length;

      if (records.length === 0) {
        this.renderEmptyState();
        return;
      }

      UI.elements.historyList.innerHTML = records.map(record =>
        this.createRecordCard(record)
      ).join('');

      this.bindCardEvents();
    },

    renderEmptyState() {
      UI.elements.historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌿</div>
          <p>还没有碳排放记录</p>
          <p class="empty-hint">填写左侧表单开始记录你的碳足迹</p>
        </div>
      `;
    },

    createRecordCard(record) {
      return `
        <div class="record-item category-${record.category}" data-id="${record.id}">
          <div class="record-header">
            <span class="record-category">${record.category}</span>
            <span class="record-emission">${record.emission_kg.toFixed(2)} kg</span>
          </div>
          <div class="record-action">${UI.escapeHtml(record.action)}</div>
          <div class="record-footer">
            <span class="record-date">${UI.formatDate(record.date)}</span>
            <button class="delete-btn" data-delete="${record.id}">删除</button>
          </div>
        </div>
      `;
    },

    bindCardEvents() {
      const deleteBtns = UI.elements.historyList.querySelectorAll('[data-delete]');
      deleteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteRecord(btn.dataset.delete);
        });
      });
    },

    deleteRecord(id) {
      if (!confirm('确定要删除这条记录吗？此操作不可恢复。')) return;

      StorageManager.deleteRecord(id);
      UI.showToast('记录已删除', 'success');
      CarbonApp.refresh();
    }
  };

  const StatsPanel = {
    render() {
      const records = StorageManager.getRecords();
      const monthlyTotal = Statistics.getMonthlyTotal(records);
      const dailyAverage = Statistics.getDailyAverage(records);
      const comparison = Statistics.compareWithNational(dailyAverage);

      UI.elements.monthlyTotal.textContent = monthlyTotal.toFixed(1);
      UI.elements.dailyAverage.textContent = dailyAverage.toFixed(1);

      const barWidth = Math.min(100, comparison.ratio);
      UI.elements.personalBar.style.width = barWidth + '%';

      const resultEl = UI.elements.comparisonResult;
      resultEl.className = 'comparison-result';

      if (comparison.level === 'none') {
        resultEl.textContent = '暂无数据';
      } else if (comparison.level === 'good') {
        resultEl.classList.add('good');
        resultEl.textContent = `🌱 很棒！你的日均排放比全国人均低 ${(100 - comparison.ratio).toFixed(0)}%`;
      } else if (comparison.level === 'warning') {
        resultEl.classList.add('warning');
        const diff = Math.abs(100 - comparison.ratio).toFixed(0);
        if (comparison.ratio >= 100) {
          resultEl.textContent = `⚠️ 你的日均排放比全国人均高 ${diff}%，可以再努力哦`;
        } else {
          resultEl.textContent = `👍 不错！你的日均排放接近全国人均水平，继续保持`;
        }
      } else {
        resultEl.classList.add('high');
        resultEl.textContent = `🔥 你的日均排放比全国人均高 ${(comparison.ratio - 100).toFixed(0)}%，建议采取减排措施`;
      }
    }
  };

  const CarbonApp = {
    init() {
      UI.init();
      FormHandler.init();
      ChartRenderer.init();
      this.refresh();
    },

    refresh() {
      StatsPanel.render();
      HistoryList.render();
      ChartRenderer.render();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CarbonApp.init());
  } else {
    CarbonApp.init();
  }
})();
