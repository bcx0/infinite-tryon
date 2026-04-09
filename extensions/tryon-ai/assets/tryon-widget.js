/**
 * Infinite TryOn Widget
 * Modern, responsive, localized virtual try-on widget for Shopify
 */

(function() {
  'use strict';

  // Translation strings
  const TRANSLATIONS = {
    fr: {
      title: 'Essayage virtuel',
      subtitle: 'Essayez ce vêtement sur votre photo',
      dropzone: 'Glissez votre photo ici ou cliquez pour sélectionner',
      dropzoneHint: 'Photo en pied, de face, bras le long du corps',
      fileTooLarge: 'Fichier trop volumineux (max 10 Mo)',
      invalidFormat: 'Format non supporté. Utilisez JPG, PNG ou WebP.',
      generate: 'Essayer virtuellement',
      generating: 'Génération en cours…',
      step1: 'Analyse de votre photo…',
      step2: 'Application du vêtement…',
      step3: 'Finalisation…',
      tryAgain: 'Réessayer',
      disclaimer: 'Aperçu généré par IA — le rendu réel peut légèrement varier.',
      sessionExpired: 'Session expirée. Veuillez réouvrir l\'application dans l\'admin Shopify.',
      limitReached: 'Limite de produits atteinte pour votre abonnement.',
      connectionError: 'Erreur de connexion. Veuillez réessayer.',
      remove: 'Supprimer'
    },
    en: {
      title: 'Virtual Try-On',
      subtitle: 'Try this garment on your photo',
      dropzone: 'Drag your photo here or click to select',
      dropzoneHint: 'Full body photo, facing camera, arms at sides',
      fileTooLarge: 'File too large (max 10 MB)',
      invalidFormat: 'Unsupported format. Use JPG, PNG or WebP.',
      generate: 'Try it on',
      generating: 'Generating…',
      step1: 'Analyzing your photo…',
      step2: 'Applying the garment…',
      step3: 'Finalizing…',
      tryAgain: 'Try again',
      disclaimer: 'AI-generated preview — actual appearance may slightly vary.',
      sessionExpired: 'Session expired. Please reopen the app in Shopify admin.',
      limitReached: 'Product limit reached for your subscription.',
      connectionError: 'Connection error. Please try again.',
      remove: 'Remove'
    }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

  class TryOnWidget {
    constructor(element) {
      this.element = element;
      this.state = 'idle'; // idle, loading, success, error
      this.selectedFile = null;
      this.elapsedSeconds = 0;

      // Get configuration from data attributes
      this.shopId = element.dataset.shopId;
      this.productId = element.dataset.productId;
      this.garmentImageUrl = element.dataset.garmentImageUrl;
      this.showDisclaimer = element.dataset.showDisclaimer !== 'false';
      this.buttonStyle = element.dataset.buttonStyle || 'filled';

      // Get language preference
      this.language = this.detectLanguage(element.dataset.widgetLanguage);

      // Setup API base URL with migration fallback
      this.apiBase = this.setupApiBase(element.dataset.backendUrl);
      this.checkProductUrl = `${this.apiBase}/api/check-product`;
      this.tryOnUrl = `${this.apiBase}/api/tryon`;

      // Normalize garment image URL
      if (this.garmentImageUrl?.startsWith('//')) {
        this.garmentImageUrl = 'https:' + this.garmentImageUrl;
      }

      // Get DOM elements
      this.form = element.querySelector('#tryon-form');
      this.dropzone = element.querySelector('#tryon-dropzone');
      this.fileInput = element.querySelector('#tryon-file-input');
      this.preview = element.querySelector('#tryon-preview');
      this.previewImage = element.querySelector('#tryon-preview-image');
      this.previewRemove = element.querySelector('#tryon-preview-remove');
      this.submitBtn = element.querySelector('#tryon-submit-btn');
      this.loadingContainer = element.querySelector('#tryon-loading');
      this.resultContainer = element.querySelector('#tryon-result');
      this.resultImage = element.querySelector('#tryon-result-image');
      this.retryBtn = element.querySelector('#tryon-retry-btn');
      this.errorContainer = element.querySelector('#tryon-error');
      this.errorMessage = element.querySelector('#tryon-error-message');
      this.resetBtn = element.querySelector('#tryon-reset-btn');
      this.statusTitle = element.querySelector('#tryon-status-title');
      this.statusElapsed = element.querySelector('#tryon-status-elapsed');
      this.disclaimerEl = element.querySelector('#tryon-disclaimer');

      // Apply translations
      this.applyTranslations();
      this.applyButtonStyle();

      // Setup event listeners
      this.setupEventListeners();

      // Validate configuration
      this.validateConfiguration();
    }

    detectLanguage(setting) {
      if (setting === 'fr') return 'fr';
      if (setting === 'en') return 'en';

      // Auto-detect: check HTML lang, then Shopify locale
      const htmlLang = document.documentElement.lang;
      if (htmlLang?.startsWith('fr')) return 'fr';

      if (window.Shopify?.locale?.startsWith('fr')) return 'fr';

      // Default to French for FR/BE/LU markets, English otherwise
      return 'en';
    }

    setupApiBase(backendUrl) {
      // Migration logic: ignore old Railway URL without -b5cf suffix
      let url = window.TRYON_API_BASE || backendUrl || '';

      if (url && url.includes('infinite-tryon-production.up.railway.app')) {
        url = '';
      }

      const base =
        (url || 'https://infinite-tryon-production-b5cf.up.railway.app').replace(/\/$/, '');

      return base;
    }

    applyTranslations() {
      const t = this.getTranslation.bind(this);

      document.querySelector('#tryon-title').textContent = t('title');
      document.querySelector('#tryon-subtitle').textContent = t('subtitle');
      document.querySelector('#dropzone-text').textContent = t('dropzone');
      document.querySelector('#dropzone-hint').textContent = t('dropzoneHint');
      document.querySelector('#submit-text').textContent = t('generate');
      document.querySelector('#retry-text').textContent = t('tryAgain');
      document.querySelector('#reset-text').textContent = t('tryAgain');

      if (this.disclaimerEl) {
        this.disclaimerEl.textContent = t('disclaimer');
      }

      // Update file input accept attribute hint (implicit in input)
      this.fileInput.title = t('dropzoneHint');
    }

    applyButtonStyle() {
      const isOutline = this.buttonStyle === 'outline';
      const className = isOutline ? 'tryon-button-secondary' : 'tryon-button-primary';
      const otherClass = isOutline ? 'tryon-button-primary' : 'tryon-button-secondary';

      this.submitBtn.classList.add(className);
      this.submitBtn.classList.remove(otherClass);
      this.retryBtn.classList.add('tryon-button-secondary');
      this.resetBtn.classList.add('tryon-button-secondary');
    }

    getTranslation(key) {
      return TRANSLATIONS[this.language]?.[key] || TRANSLATIONS.en[key] || key;
    }

    validateConfiguration() {
      if (!this.shopId || !this.productId) {
        this.showError('Configuration error: missing shop or product ID');
      }
      if (!this.garmentImageUrl) {
        this.showError('Configuration error: product image not found');
      }
    }

    setupEventListeners() {
      // Dropzone drag and drop
      this.dropzone.addEventListener('click', () => this.fileInput.click());
      this.dropzone.addEventListener('dragover', (e) => this.handleDragOver(e));
      this.dropzone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      this.dropzone.addEventListener('drop', (e) => this.handleDrop(e));

      // File input change
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

      // Preview remove
      this.previewRemove.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearPreview();
      });

      // Form submit
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));

      // Retry button
      this.retryBtn.addEventListener('click', () => this.reset());
      this.resetBtn.addEventListener('click', () => this.reset());
    }

    handleDragOver(e) {
      e.preventDefault();
      e.stopPropagation();
      this.dropzone.classList.add('dragging');
    }

    handleDragLeave(e) {
      e.preventDefault();
      e.stopPropagation();
      this.dropzone.classList.remove('dragging');
    }

    handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      this.dropzone.classList.remove('dragging');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processFile(files[0]);
      }
    }

    handleFileSelect(e) {
      const files = e.target.files;
      if (files.length > 0) {
        this.processFile(files[0]);
      }
    }

    processFile(file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        this.showError(this.getTranslation('fileTooLarge'));
        this.fileInput.value = '';
        return;
      }

      // Validate file format
      if (!ALLOWED_FORMATS.includes(file.type)) {
        this.showError(this.getTranslation('invalidFormat'));
        this.fileInput.value = '';
        return;
      }

      this.selectedFile = file;
      this.showPreview(file);
      this.hideError();
    }

    showPreview(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewImage.src = e.target.result;
        this.preview.style.display = 'block';
        this.dropzone.style.display = 'none';
        this.dropzone.classList.add('has-preview');
      };
      reader.readAsDataURL(file);
    }

    clearPreview() {
      this.selectedFile = null;
      this.fileInput.value = '';
      this.preview.style.display = 'none';
      this.dropzone.style.display = 'flex';
      this.dropzone.classList.remove('has-preview');
    }

    async handleSubmit(e) {
      e.preventDefault();

      if (!this.selectedFile) {
        this.showError('Please select a photo');
        return;
      }

      // Check product eligibility
      try {
        this.setLoading(true, this.getTranslation('step1'));
        const allowed = await this.verifyProductAllowed();

        if (!allowed) {
          this.showError(this.getTranslation('limitReached'));
          this.setLoading(false);
          return;
        }

        // Start try-on process
        await this.processTryOn();
      } catch (error) {
        console.error('[TryOn Widget]', error);
        this.showError(error.message || this.getTranslation('connectionError'));
      } finally {
        this.setLoading(false);
      }
    }

    async processTryOn() {
      this.setState('loading');
      this.showLoading();
      this.elapsedSeconds = 0;

      // Animate status text through steps
      const steps = [
        this.getTranslation('step1'),
        this.getTranslation('step2'),
        this.getTranslation('step3')
      ];

      let stepIndex = 0;
      const statusInterval = setInterval(() => {
        stepIndex = (stepIndex + 1) % steps.length;
        this.statusTitle.textContent = steps[stepIndex];
      }, 7000);

      // Update elapsed time
      const timerInterval = setInterval(() => {
        this.elapsedSeconds++;
        this.statusElapsed.textContent = `${this.elapsedSeconds}s`;
      }, 1000);

      try {
        // Convert file to base64
        const personImageBase64 = await this.fileToBase64(this.selectedFile);

        // Call try-on API
        const response = await fetch(this.tryOnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-domain': this.shopId
          },
          body: JSON.stringify({
            shop_id: this.shopId,
            product_id: this.productId,
            garmentImageUrl: this.garmentImageUrl,
            personImageBase64,
            personImageUrl: undefined
          })
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || this.getTranslation('connectionError'));
        }

        if (!payload?.success || !payload?.imageUrl) {
          throw new Error(payload?.error || 'Failed to generate try-on image');
        }

        // Show result
        this.setState('success');
        this.showResult(payload.imageUrl);
      } catch (error) {
        throw error;
      } finally {
        clearInterval(statusInterval);
        clearInterval(timerInterval);
      }
    }

    async verifyProductAllowed() {
      try {
        const response = await fetch(this.checkProductUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shop_id: this.shopId,
            product_id: this.productId
          })
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(this.getTranslation('sessionExpired'));
          }
          throw new Error(this.getTranslation('connectionError'));
        }

        const payload = await response.json();
        return Boolean(payload.allowed);
      } catch (error) {
        throw error;
      }
    }

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    setState(newState) {
      this.state = newState;
    }

    setLoading(isLoading, statusText = '') {
      this.submitBtn.disabled = isLoading;
      if (isLoading && statusText) {
        this.statusTitle.textContent = statusText;
      }
    }

    showLoading() {
      this.form.style.display = 'none';
      this.resultContainer.style.display = 'none';
      this.errorContainer.style.display = 'none';
      this.loadingContainer.style.display = 'block';
    }

    showResult(imageUrl) {
      this.loadingContainer.style.display = 'none';
      this.form.style.display = 'none';
      this.errorContainer.style.display = 'none';

      this.resultImage.src = imageUrl;
      if (this.showDisclaimer) {
        this.disclaimerEl.style.display = 'block';
      }
      this.resultContainer.style.display = 'block';
    }

    showError(message) {
      this.loadingContainer.style.display = 'none';
      this.resultContainer.style.display = 'none';

      this.errorMessage.textContent = message;
      this.errorContainer.style.display = 'block';

      this.setState('error');
    }

    hideError() {
      this.errorContainer.style.display = 'none';
    }

    reset() {
      this.setState('idle');
      this.clearPreview();
      this.loadingContainer.style.display = 'none';
      this.resultContainer.style.display = 'none';
      this.errorContainer.style.display = 'none';
      this.form.style.display = 'block';
      this.submitBtn.disabled = false;
      this.elapsedSeconds = 0;
    }
  }

  // Initialize when DOM is ready
  function init() {
    const widgets = document.querySelectorAll('#tryon-widget');
    widgets.forEach((element) => {
      new TryOnWidget(element);
    });
  }

  // Expose to global scope for manual initialization
  window.TryOnWidget = {
    init
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
