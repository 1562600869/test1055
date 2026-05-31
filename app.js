(function() {
  'use strict';

  const STORAGE_KEYS = {
    RECORDS: 'coffeeBrewRecords',
    BEAN_NAMES: 'coffeeBeanNames'
  };

  const FIELD_LABELS = {
    beanName: '豆子名称',
    grindSize: '研磨度',
    coffeeWeight: '粉量',
    waterTemp: '水温',
    waterAmount: '注水量',
    brewTime: '萃取时长',
    rating: '风味评分'
  };

  const FIELD_UNITS = {
    grindSize: '',
    coffeeWeight: 'g',
    waterTemp: '°C',
    waterAmount: 'ml',
    brewTime: 's',
    rating: ' 分'
  };

  const StorageManager = {
    getRecords() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('读取记录失败:', e);
        return [];
      }
    },

    saveRecord(record) {
      const records = this.getRecords();
      records.push(record);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      this.saveBeanName(record.beanName);
      return records;
    },

    deleteRecord(id) {
      const records = this.getRecords();
      const filtered = records.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(filtered));
      this.updateBeanNames();
      return filtered;
    },

    getBeanNames() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.BEAN_NAMES);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('读取豆子名称失败:', e);
        return [];
      }
    },

    saveBeanName(name) {
      if (!name || name.trim() === '') return;
      const names = this.getBeanNames();
      if (!names.includes(name.trim())) {
        names.push(name.trim());
        localStorage.setItem(STORAGE_KEYS.BEAN_NAMES, JSON.stringify(names));
      }
    },

    updateBeanNames() {
      const records = this.getRecords();
      const names = [...new Set(records.map(r => r.beanName).filter(Boolean))];
      localStorage.setItem(STORAGE_KEYS.BEAN_NAMES, JSON.stringify(names));
    }
  };

  const UI = {
    elements: {},

    init() {
      this.elements = {
        brewForm: document.getElementById('brewForm'),
        beanName: document.getElementById('beanName'),
        grindSize: document.getElementById('grindSize'),
        grindSizeNum: document.getElementById('grindSizeNum'),
        grindSizeValue: document.getElementById('grindSizeValue'),
        coffeeWeight: document.getElementById('coffeeWeight'),
        waterTemp: document.getElementById('waterTemp'),
        waterAmount: document.getElementById('waterAmount'),
        brewTime: document.getElementById('brewTime'),
        rating: document.getElementById('rating'),
        ratingNum: document.getElementById('ratingNum'),
        ratingValue: document.getElementById('ratingValue'),
        ratingStars: document.getElementById('ratingStars'),
        beanSuggestions: document.getElementById('beanSuggestions'),
        historyList: document.getElementById('historyList'),
        recordCount: document.getElementById('recordCount'),
        beanFilter: document.getElementById('beanFilter'),
        clearFilter: document.getElementById('clearFilter'),
        ratingChart: document.getElementById('ratingChart'),
        emptyChart: document.getElementById('emptyChart'),
        compareHint: document.getElementById('compareHint'),
        selectedCount: document.getElementById('selectedCount'),
        doCompareBtn: document.getElementById('doCompareBtn'),
        compareCard: document.getElementById('compareCard'),
        compareContent: document.getElementById('compareContent'),
        diffCount: document.getElementById('diffCount'),
        closeCompare: document.getElementById('closeCompare'),
        toast: document.getElementById('toast'),
        historyCard: document.querySelector('.history-card')
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

    updateSliderProgress(slider) {
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const value = parseFloat(slider.value);
      const progress = ((value - min) / (max - min)) * 100;
      slider.style.setProperty('--range-progress', progress + '%');
    },

    updateRatingStars(rating) {
      const { ratingStars } = this.elements;
      const stars = ratingStars.querySelectorAll('span');
      stars.forEach((star, index) => {
        if (index < Math.floor(rating)) {
          star.textContent = '★';
          star.classList.add('active');
        } else if (index < rating) {
          star.textContent = '★';
          star.classList.add('active');
        } else {
          star.textContent = '☆';
          star.classList.remove('active');
        }
      });
    },

    updateBeanSuggestions() {
      const { beanSuggestions } = this.elements;
      const names = StorageManager.getBeanNames();
      beanSuggestions.innerHTML = names.map(n => `<option value="${this.escapeHtml(n)}">`).join('');
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    formatDate(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      const oneDay = 24 * 60 * 60 * 1000;

      if (diff < oneDay && date.getDate() === now.getDate()) {
        return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      } else if (diff < 2 * oneDay) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      } else if (diff < 7 * oneDay) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[date.getDay()] + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) +
               ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      }
    },

    formatValue(field, value) {
      if (field === 'beanName') return value;
      const unit = FIELD_UNITS[field] || '';
      return value + unit;
    },

    renderStars(rating) {
      let stars = '';
      for (let i = 1; i <= 5; i++) {
        stars += `<span class="${i <= rating ? 'filled' : ''}">${i <= rating ? '★' : '☆'}</span>`;
      }
      return stars;
    }
  };

  const FormHandler = {
    init() {
      this.bindSliderEvents();
      this.bindStarEvents();
      this.bindFormSubmit();
      UI.updateSliderProgress(UI.elements.grindSize);
      UI.updateSliderProgress(UI.elements.rating);
      UI.updateRatingStars(parseFloat(UI.elements.rating.value));
      UI.updateBeanSuggestions();
    },

    bindSliderEvents() {
      const { grindSize, grindSizeNum, grindSizeValue, rating, ratingNum, ratingValue } = UI.elements;

      const syncGrindSize = (rawVal) => {
        const parsed = parseFloat(rawVal);
        if (isNaN(parsed)) return;
        if (parsed < 1 || parsed > 10) {
          UI.showToast('研磨度需在 1-10 之间', 'error');
          const corrected = Math.min(10, Math.max(1, parsed));
          grindSize.value = corrected;
          grindSizeNum.value = corrected;
          grindSizeValue.textContent = corrected;
          UI.updateSliderProgress(grindSize);
          return;
        }
        grindSize.value = parsed;
        grindSizeNum.value = parsed;
        grindSizeValue.textContent = parsed;
        UI.updateSliderProgress(grindSize);
      };

      const syncRating = (val) => {
        const value = Math.min(5, Math.max(1, Math.round(parseFloat(val) * 2) / 2 || 1));
        rating.value = value;
        ratingNum.value = value;
        ratingValue.textContent = value;
        UI.updateSliderProgress(rating);
        UI.updateRatingStars(value);
      };

      grindSize.addEventListener('input', (e) => syncGrindSize(e.target.value));
      grindSizeNum.addEventListener('input', (e) => syncGrindSize(e.target.value));
      rating.addEventListener('input', (e) => syncRating(e.target.value));
      ratingNum.addEventListener('input', (e) => syncRating(e.target.value));
    },

    bindStarEvents() {
      const { ratingStars } = UI.elements;
      ratingStars.querySelectorAll('span').forEach(star => {
        star.addEventListener('click', () => {
          const value = parseInt(star.dataset.value);
          UI.elements.rating.value = value;
          UI.elements.ratingNum.value = value;
          UI.elements.ratingValue.textContent = value;
          UI.updateSliderProgress(UI.elements.rating);
          UI.updateRatingStars(value);
        });
      });
    },

    bindFormSubmit() {
      UI.elements.brewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    },

    handleSubmit() {
      const formData = {
        id: Date.now().toString(),
        beanName: UI.elements.beanName.value.trim(),
        grindSize: parseFloat(UI.elements.grindSize.value),
        coffeeWeight: parseFloat(UI.elements.coffeeWeight.value),
        waterTemp: parseFloat(UI.elements.waterTemp.value),
        waterAmount: parseInt(UI.elements.waterAmount.value),
        brewTime: parseInt(UI.elements.brewTime.value),
        rating: parseFloat(UI.elements.rating.value),
        createdAt: Date.now()
      };

      if (!this.validate(formData)) {
        return;
      }

      StorageManager.saveRecord(formData);
      UI.showToast('记录保存成功！', 'success');
      this.resetForm();
      UI.updateBeanSuggestions();
      BrewApp.refresh();
    },

    validate(data) {
      if (!data.beanName) {
        UI.showToast('请输入豆子名称', 'error');
        return false;
      }
      if (data.grindSize < 1 || data.grindSize > 10) {
        UI.showToast('研磨度需在 1-10 之间', 'error');
        return false;
      }
      if (data.coffeeWeight <= 0 || data.coffeeWeight > 100) {
        UI.showToast('粉量需在 1-100 克之间', 'error');
        return false;
      }
      if (data.waterTemp < 80 || data.waterTemp > 100) {
        UI.showToast('水温需在 80-100°C 之间', 'error');
        return false;
      }
      if (data.waterAmount < 50 || data.waterAmount > 1000) {
        UI.showToast('注水量需在 50-1000ml 之间', 'error');
        return false;
      }
      if (data.brewTime < 10 || data.brewTime > 600) {
        UI.showToast('萃取时长需在 10-600 秒之间', 'error');
        return false;
      }
      if (data.rating < 1 || data.rating > 5) {
        UI.showToast('评分需在 1-5 之间', 'error');
        return false;
      }
      return true;
    },

    resetForm() {
      UI.elements.beanName.value = '';
      UI.elements.grindSize.value = 5;
      UI.elements.grindSizeNum.value = 5;
      UI.elements.grindSizeValue.textContent = 5;
      UI.elements.coffeeWeight.value = 15;
      UI.elements.waterTemp.value = 92;
      UI.elements.waterAmount.value = 240;
      UI.elements.brewTime.value = 150;
      UI.elements.rating.value = 3;
      UI.elements.ratingNum.value = 3;
      UI.elements.ratingValue.textContent = 3;
      UI.updateSliderProgress(UI.elements.grindSize);
      UI.updateSliderProgress(UI.elements.rating);
      UI.updateRatingStars(3);
      UI.elements.beanName.focus();
    }
  };

  const HistoryList = {
    selectedRecords: new Set(),
    currentFilter: '',

    init() {
      this.bindFilterEvents();
      this.bindCompareEvents();
    },

    bindFilterEvents() {
      const { beanFilter, clearFilter } = UI.elements;

      beanFilter.addEventListener('input', (e) => {
        this.currentFilter = e.target.value.trim().toLowerCase();
        clearFilter.style.display = this.currentFilter ? 'block' : 'none';
        this.render();
      });

      clearFilter.addEventListener('click', () => {
        beanFilter.value = '';
        this.currentFilter = '';
        clearFilter.style.display = 'none';
        this.render();
      });
    },

    bindCompareEvents() {
      const { doCompareBtn, closeCompare } = UI.elements;

      doCompareBtn.addEventListener('click', () => {
        if (this.selectedRecords.size === 2) {
          const ids = Array.from(this.selectedRecords);
          CompareManager.showComparison(ids[0], ids[1]);
        }
      });

      closeCompare.addEventListener('click', () => {
        CompareManager.hideComparison();
      });
    },

    render() {
      let records = StorageManager.getRecords();
      records = records.sort((a, b) => b.createdAt - a.createdAt);

      if (this.currentFilter) {
        records = records.filter(r =>
          r.beanName.toLowerCase().includes(this.currentFilter)
        );
      }

      UI.elements.recordCount.textContent = StorageManager.getRecords().length;

      if (records.length === 0) {
        this.renderEmptyState();
        return;
      }

      UI.elements.historyCard.classList.remove('history-card-empty');
      UI.elements.historyList.innerHTML = records.map(record =>
        this.createRecordCard(record)
      ).join('');

      this.bindCardEvents();
      this.updateCompareHint();
    },

    renderEmptyState() {
      UI.elements.historyCard.classList.add('history-card-empty');
      UI.elements.historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">☕</div>
          <p>${this.currentFilter ? '没有找到匹配的豆子' : '还没有冲煮记录'}</p>
          <p class="empty-hint">${this.currentFilter ? '试试其他关键词' : '填写左侧表单开始记录你的第一杯手冲'}</p>
        </div>
      `;
    },

    createRecordCard(record) {
      const isSelected = this.selectedRecords.has(record.id);
      const selectedClass = isSelected ? 'selected' : '';

      return `
        <div class="record-card ${selectedClass}" data-id="${record.id}">
          <div class="record-header">
            <span class="record-bean">${UI.escapeHtml(record.beanName)}</span>
            <div class="record-rating">
              ${UI.renderStars(record.rating)}
            </div>
          </div>
          <div class="record-params">
            <div class="param-item">
              <span class="param-label">研磨度</span>
              <span class="param-value">${record.grindSize}</span>
            </div>
            <div class="param-item">
              <span class="param-label">粉量</span>
              <span class="param-value">${record.coffeeWeight}g</span>
            </div>
            <div class="param-item">
              <span class="param-label">水温</span>
              <span class="param-value">${record.waterTemp}°C</span>
            </div>
            <div class="param-item">
              <span class="param-label">注水量</span>
              <span class="param-value">${record.waterAmount}ml</span>
            </div>
            <div class="param-item">
              <span class="param-label">时长</span>
              <span class="param-value">${record.brewTime}s</span>
            </div>
            <div class="param-item">
              <span class="param-label">粉水比</span>
              <span class="param-value">1:${(record.waterAmount / record.coffeeWeight).toFixed(1)}</span>
            </div>
          </div>
          <div class="record-footer">
            <span class="record-date">${UI.formatDate(record.createdAt)}</span>
            <button class="delete-btn" data-delete="${record.id}">删除</button>
          </div>
        </div>
      `;
    },

    bindCardEvents() {
      const cards = UI.elements.historyList.querySelectorAll('.record-card');

      cards.forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.hasAttribute('data-delete')) return;
          this.toggleSelection(card.dataset.id);
        });

        const deleteBtn = card.querySelector('[data-delete]');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteRecord(deleteBtn.dataset.delete);
        });
      });
    },

    toggleSelection(id) {
      if (this.selectedRecords.has(id)) {
        this.selectedRecords.delete(id);
      } else {
        if (this.selectedRecords.size >= 2) {
          UI.showToast('最多只能选择 2 条记录进行对比', 'error');
          return;
        }
        this.selectedRecords.add(id);
      }
      this.render();
    },

    updateCompareHint() {
      const { compareHint, selectedCount, doCompareBtn } = UI.elements;

      if (this.selectedRecords.size > 0) {
        compareHint.style.display = 'flex';
        selectedCount.textContent = this.selectedRecords.size;
        doCompareBtn.disabled = this.selectedRecords.size !== 2;
      } else {
        compareHint.style.display = 'none';
      }
    },

    deleteRecord(id) {
      if (!confirm('确定要删除这条记录吗？此操作不可恢复。')) return;

      StorageManager.deleteRecord(id);
      this.selectedRecords.delete(id);
      UI.showToast('记录已删除', 'success');
      UI.updateBeanSuggestions();
      BrewApp.refresh();
    },

    clearSelection() {
      this.selectedRecords.clear();
      this.updateCompareHint();
    }
  };

  const ChartRenderer = {
    animationFrame: null,

    init() {
      window.addEventListener('resize', () => this.render());
    },

    render() {
      const records = StorageManager.getRecords()
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-20);

      if (records.length === 0) {
        UI.elements.emptyChart.style.display = 'block';
        return;
      }

      UI.elements.emptyChart.style.display = 'none';

      const canvas = UI.elements.ratingChart;
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
      const padding = { top: 30, right: 20, bottom: 40, left: 40 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      const ratings = records.map(r => r.rating);
      const dataMin = Math.min(...ratings);
      const dataMax = Math.max(...ratings);
      const minRating = dataMin - 0.5;
      const maxRating = dataMax + 0.5;

      this.drawGrid(ctx, padding, chartWidth, chartHeight, minRating, maxRating);
      this.drawAxes(ctx, padding, chartWidth, chartHeight, minRating, maxRating);
      this.drawLine(ctx, records, padding, chartWidth, chartHeight, minRating, maxRating);
      this.drawDataPoints(ctx, records, padding, chartWidth, chartHeight, minRating, maxRating);
      this.drawLabels(ctx, records, padding, chartWidth, chartHeight);
    },

    drawGrid(ctx, padding, width, height, minY, maxY) {
      ctx.strokeStyle = 'rgba(62, 39, 35, 0.08)';
      ctx.lineWidth = 1;

      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const y = padding.top + (height / ySteps) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + width, y);
        ctx.stroke();
      }

      const xSteps = Math.min(10, 20);
      for (let i = 0; i <= xSteps; i++) {
        const x = padding.left + (width / xSteps) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + height);
        ctx.stroke();
      }
    },

    drawAxes(ctx, padding, width, height, minY, maxY) {
      ctx.strokeStyle = 'rgba(62, 39, 35, 0.3)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + height);
      ctx.lineTo(padding.left + width, padding.top + height);
      ctx.stroke();

      ctx.fillStyle = '#6D4C41';
      ctx.font = '11px Lato, sans-serif';
      ctx.textAlign = 'right';

      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const y = padding.top + (height / ySteps) * i;
        const value = maxY - ((maxY - minY) / ySteps) * i;
        ctx.fillText(value.toFixed(1), padding.left - 8, y + 4);
      }
    },

    drawLine(ctx, records, padding, width, height, minY, maxY) {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + height);
      gradient.addColorStop(0, 'rgba(255, 143, 0, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 143, 0, 0.02)');

      ctx.beginPath();
      records.forEach((record, i) => {
        const x = padding.left + (width / (records.length - 1 || 1)) * i;
        const y = padding.top + height - ((record.rating - minY) / (maxY - minY)) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.lineTo(padding.left + width, padding.top + height);
      ctx.lineTo(padding.left, padding.top + height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      records.forEach((record, i) => {
        const x = padding.left + (width / (records.length - 1 || 1)) * i;
        const y = padding.top + height - ((record.rating - minY) / (maxY - minY)) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.strokeStyle = '#FF8F00';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    },

    drawDataPoints(ctx, records, padding, width, height, minY, maxY) {
      records.forEach((record, i) => {
        const x = padding.left + (width / (records.length - 1 || 1)) * i;
        const y = padding.top + height - ((record.rating - minY) / (maxY - minY)) * height;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#FF8F00';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF8F00';
        ctx.fill();
      });
    },

    drawLabels(ctx, records, padding, width, height) {
      if (records.length <= 1) return;

      ctx.fillStyle = '#8D6E63';
      ctx.font = '10px Lato, sans-serif';
      ctx.textAlign = 'center';

      const step = Math.ceil(records.length / 6);

      records.forEach((record, i) => {
        if (i % step !== 0 && i !== records.length - 1) return;

        const x = padding.left + (width / (records.length - 1)) * i;
        const date = new Date(record.createdAt);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;

        ctx.fillText(label, x, padding.top + height + 20);
      });
    }
  };

  const CompareManager = {
    showComparison(id1, id2) {
      const records = StorageManager.getRecords();
      const recordA = records.find(r => r.id === id1);
      const recordB = records.find(r => r.id === id2);

      if (!recordA || !recordB) {
        UI.showToast('找不到记录', 'error');
        return;
      }

      const fields = ['beanName', 'grindSize', 'coffeeWeight', 'waterTemp', 'waterAmount', 'brewTime', 'rating'];
      let diffCount = 0;

      const container = UI.elements.compareContent;
      container.innerHTML = '';

      fields.forEach(field => {
        const valueA = recordA[field];
        const valueB = recordB[field];
        const isDiff = valueA !== valueB;

        if (isDiff) diffCount++;

        const row = document.createElement('div');
        row.className = 'compare-row' + (isDiff ? ' diff' : '');

        const cellA = document.createElement('div');
        cellA.className = 'compare-value a';
        if (field === 'rating') {
          this.appendRatingCell(cellA, valueA);
        } else {
          cellA.textContent = UI.formatValue(field, valueA);
        }

        const nameCell = document.createElement('div');
        nameCell.className = 'compare-param-name';
        nameCell.textContent = FIELD_LABELS[field];

        const cellB = document.createElement('div');
        cellB.className = 'compare-value b';
        if (field === 'rating') {
          this.appendRatingCell(cellB, valueB);
        } else {
          cellB.textContent = UI.formatValue(field, valueB);
        }

        row.appendChild(cellA);
        row.appendChild(nameCell);
        row.appendChild(cellB);
        container.appendChild(row);
      });

      UI.elements.diffCount.textContent = diffCount + ' 处差异';
      UI.elements.compareCard.style.display = 'block';

      setTimeout(() => {
        UI.elements.compareCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    },

    appendRatingCell(cell, rating) {
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = i <= rating ? 'filled' : '';
        star.textContent = i <= rating ? '★' : '☆';
        cell.appendChild(star);
      }
      const text = document.createTextNode(' (' + rating + '分)');
      cell.appendChild(text);
    },

    hideComparison() {
      UI.elements.compareCard.style.display = 'none';
      HistoryList.clearSelection();
      HistoryList.render();
    }
  };

  const BrewApp = {
    init() {
      UI.init();
      FormHandler.init();
      HistoryList.init();
      ChartRenderer.init();
      this.refresh();
    },

    refresh() {
      HistoryList.render();
      ChartRenderer.render();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BrewApp.init());
  } else {
    BrewApp.init();
  }
})();
