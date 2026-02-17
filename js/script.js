document.addEventListener('DOMContentLoaded', function () {
    const pagePath = window.location.pathname.split('/').pop();

    // --- Mobile Menü ---
    const menuToggle = document.querySelector('.menu-toggle-pro');
    const navLinks = document.querySelector('.nav-links-pro');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            const open = navLinks.classList.toggle('is-open');
            menuToggle.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('no-scroll', open);
        });
        navLinks.querySelectorAll('a').forEach(a =>
            a.addEventListener('click', () => {
                navLinks.classList.remove('is-open');
                menuToggle.setAttribute('aria-expanded', 'false');
            })
        );
    }

    // --- Active Link automatisch setzen ---
    function updateActiveNav() {
        const currentPath = location.pathname.replace(/\/index\.html?$/, '/');
        const currentHash = location.hash;

        // First remove all active classes
        document.querySelectorAll('.nav-links-pro a').forEach(a => {
            a.classList.remove('active');
        });

        // Then add active to the correct link
        document.querySelectorAll('.nav-links-pro a[href]').forEach(a => {
            const href = a.getAttribute('href');
            const url = new URL(href, location.origin);
            const path = url.pathname.replace(/\/index\.html?$/, '/');
            const hash = url.hash;

            if (path === currentPath) {
                // If current URL has a hash, only the link with that hash is active
                if (currentHash && hash === currentHash) {
                    a.classList.add('active');
                }
                // If current URL has no hash, only links without hash are active
                else if (!currentHash && !hash) {
                    a.classList.add('active');
                }
            }
        });
    }

    updateActiveNav();

    // Update on hash change
    window.addEventListener('hashchange', updateActiveNav);

    // --- Smooth Scrolling (nur bei existierendem Ziel) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // --- Fade-In Effekt ---
    const sections = document.querySelectorAll('.fade-in-section');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    sections.forEach(section => observer.observe(section));

    // --- Content Loader ---
    if (typeof content !== 'undefined') {
        if ((pagePath === '' || pagePath === 'index.html') && content.index) {
            loadIndexContent(content.index);
        } else if (pagePath === 'ueber-uns.html' && content.ueber_uns_page) {
            loadUeberUnsContent(content.ueber_uns_page);
        } else if (pagePath === 'spenden.html' && content.spenden_page) {
            loadSpendenContent(content.spenden_page);
        } else if (pagePath === 'datenschutz.html' && content.datenschutz_page) {
            loadDatenschutzContent(content.datenschutz_page);
        } else if (pagePath === 'impressum.html' && content.impressum_page) {
            loadImpressumContent(content.impressum_page);
        } else if (pagePath === 'gottesdienste.html' && content.gottesdienste_page) {
            loadGottesdiensteContent(content.gottesdienste_page);
        }
    }

    
    // --- CMS Preview Click-to-Edit ---
    const searchParams = new URLSearchParams(window.location.search);
    const isCmsPreview = searchParams.has('cms-preview');
    if (isCmsPreview) {
        document.body.classList.add('cms-preview');

        document.addEventListener('click', function (event) {
            const target = event.target.closest('[data-cms-field]');
            if (!target) return;
            event.preventDefault();
            event.stopPropagation();

            document.querySelectorAll('.cms-selected-field').forEach(el => {
                el.classList.remove('cms-selected-field');
            });
            target.classList.add('cms-selected-field');

            window.parent.postMessage({
                type: 'cms-select-field',
                field: target.getAttribute('data-cms-field'),
                label: target.getAttribute('data-cms-label') || '',
                format: target.getAttribute('data-cms-format') || '',
                attr: target.getAttribute('data-cms-attr') || ''
            }, '*');
        }, true);

        window.addEventListener('message', function (event) {
            if (!event.data || event.data.type !== 'cms-update-field') return;
            const field = event.data.field;
            const value = event.data.value;
            if (!field) return;
            updatePreviewField(field, value);
            if (field === 'events_section.show_count') {
                applyEventsCount(value);
            }
        });
    }

    // --- Contact Form (API + Netlify Fallback) ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const statusEl = document.getElementById('contact-status');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const isLocalStaticSite = location.hostname === 'localhost' && location.port === '8080';
        const hasNetlifyForm = contactForm.getAttribute('data-netlify') === 'true';

        // E-Mail Validierung
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        async function submitToContactApi(payload) {
            const apiBase = isLocalStaticSite ? 'http://localhost:3001' : '';
            let res;

            try {
                res = await fetch(`${apiBase}/api/contact`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            } catch (err) {
                const networkError = new Error('Kontakt-Server nicht erreichbar. Bitte spaeter erneut versuchen.');
                networkError.code = 'API_NETWORK';
                throw networkError;
            }

            const contentType = (res.headers.get('content-type') || '').toLowerCase();
            let data = null;

            if (contentType.includes('application/json')) {
                try {
                    data = await res.json();
                } catch (err) {
                    const parseError = new Error('Ungueltige Antwort vom Kontakt-Server.');
                    parseError.code = 'API_NON_JSON';
                    throw parseError;
                }
            } else {
                data = { raw: await res.text() };
            }

            if (!res.ok) {
                const apiError = new Error((data && data.error) ? data.error : 'Fehler beim Senden');
                apiError.code = (res.status === 404 || res.status === 405 || res.status >= 500)
                    ? 'API_UNAVAILABLE'
                    : 'API_VALIDATION';
                throw apiError;
            }

            if (!contentType.includes('application/json')) {
                const unexpectedResponseError = new Error('Kontakt-API hat keine JSON-Antwort geliefert.');
                unexpectedResponseError.code = 'API_NON_JSON';
                throw unexpectedResponseError;
            }

            return data || {};
        }

        async function submitToNetlifyForm(payload) {
            const formName = contactForm.getAttribute('name') || 'contact';
            const encodedBody = new URLSearchParams({
                'form-name': formName,
                name: payload.name,
                email: payload.email,
                subject: payload.subject,
                message: payload.message,
                website: payload.website
            });

            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encodedBody.toString()
            });

            if (!res.ok) {
                throw new Error('Fehler beim Senden');
            }

            return {};
        }

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(contactForm);
            const email = formData.get('email') || '';

            // E-Mail Format prüfen
            if (!isValidEmail(email)) {
                if (statusEl) {
                    statusEl.textContent = 'Bitte geben Sie eine gültige E-Mail-Adresse ein (z.B. name@beispiel.de)';
                    statusEl.className = 'form-status is-error';
                }
                return;
            }

            if (submitBtn) submitBtn.disabled = true;
            if (statusEl) {
                statusEl.textContent = 'Sende...';
                statusEl.className = 'form-status';
            }

            const payload = {
                name: formData.get('name') || '',
                email: email,
                subject: formData.get('subject') || '',
                message: formData.get('message') || '',
                website: formData.get('website') || ''
            };

            try {
                let data;

                try {
                    data = await submitToContactApi(payload);
                } catch (apiErr) {
                    const shouldFallbackToNetlify =
                        hasNetlifyForm &&
                        !isLocalStaticSite &&
                        (apiErr.code === 'API_UNAVAILABLE' || apiErr.code === 'API_NON_JSON' || apiErr.code === 'API_NETWORK');

                    if (!shouldFallbackToNetlify) {
                        throw apiErr;
                    }

                    data = await submitToNetlifyForm(payload);
                }

                if (statusEl) {
                    const ticketInfo = data.ticketId ? ` Ticket: ${data.ticketId}` : '';
                    const internalMailFailed =
                        data &&
                        data.emailStatus &&
                        data.emailStatus.internal_notification &&
                        data.emailStatus.internal_notification !== 'sent';

                    if (internalMailFailed) {
                        statusEl.textContent = `Nachricht gespeichert.${ticketInfo} E-Mail-Zustellung ist fehlgeschlagen.`;
                        statusEl.className = 'form-status is-error';
                    } else {
                        statusEl.textContent = `Danke! Wir haben deine Nachricht erhalten.${ticketInfo}`;
                        statusEl.className = 'form-status is-success';
                    }
                }
                contactForm.reset();
            } catch (err) {
                if (statusEl) {
                    statusEl.textContent = err.message || 'Fehler beim Senden';
                    statusEl.className = 'form-status is-error';
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
});

function updatePreviewField(field, value) {
    const nodes = document.querySelectorAll(`[data-cms-field="${field}"]`);
    if (!nodes.length) return;

    nodes.forEach(node => {
        const attr = node.getAttribute('data-cms-attr');
        const format = node.getAttribute('data-cms-format');
        if (attr) {
            node.setAttribute(attr, value);
            return;
        }
        if (format === 'html') {
            node.innerHTML = normalizeCmsText(value);
        } else {
            node.textContent = value;
        }
    });
}

function normalizeCmsText(value) {
    if (value == null) return '';
    return String(value).replace(/\n/g, '<br>');
}

function applyEventsCount(value) {
    const items = Array.from(document.querySelectorAll('[data-cms-role="upcoming-event-item"]'));
    if (!items.length) return;
    const max = parseInt(value, 10);
    if (Number.isNaN(max) || max < 0) {
        items.forEach(item => {
            item.style.display = '';
        });
        return;
    }
    items.forEach((item, index) => {
        item.style.display = index < max ? '' : 'none';
    });
}

function loadIndexContent(pageContent) {
    // Hero
    if (pageContent.hero) {
        const t = document.getElementById('hero-title');
        const s = document.getElementById('hero-subtitle');
        if (t) t.innerHTML = pageContent.hero.title;
        if (s) s.innerHTML = pageContent.hero.subtitle;
    }

    // Gottesdienste
    if (pageContent.gottesdienste) {
        const img = document.getElementById('gottesdienste-image');
        const ttl = document.getElementById('gottesdienste-title');
        const desc = document.getElementById('gottesdienste-description');
        const zt = document.getElementById('gottesdienste-zeiten-ort-title');
        const zd = document.getElementById('gottesdienste-zeiten-ort-details');
        const loc = document.getElementById('gottesdienste-location');
        const kids = document.getElementById('gottesdienste-kids');
        if (img) img.src = pageContent.gottesdienste.image;
        if (ttl) ttl.innerHTML = pageContent.gottesdienste.title;
        if (desc) desc.innerHTML = pageContent.gottesdienste.description;
        if (zt) zt.innerHTML = pageContent.gottesdienste.zeiten_ort_title;
        if (zd) zd.innerHTML = pageContent.gottesdienste.zeiten_ort_details;
        if (loc) loc.innerHTML = pageContent.gottesdienste.location;
        if (kids) kids.innerHTML = pageContent.gottesdienste.kids;
    }

    // Veranstaltungen
    if (pageContent.veranstaltungen && pageContent.veranstaltungen.events) {
        const titleEl = document.getElementById('veranstaltungen-title');
        if (titleEl) titleEl.innerHTML = pageContent.veranstaltungen.title;
        const eventGrid = document.getElementById('event-grid');
        if (eventGrid) {
            pageContent.veranstaltungen.events.forEach(event => {
                const eventCard = document.createElement('div');
                eventCard.className = 'event-card';
                eventCard.innerHTML = `
                    <img src="${event.image}" alt="${event.title}" class="event-image" loading="lazy">
                    <div class="event-card-content">
                        <span class="event-label">${event.label}</span>
                        <h3>${event.title}</h3>
                        <p class="event-subtitle">${event.subtitle}</p>
                    </div>
                `;
                eventGrid.appendChild(eventCard);
            });
        }
    }

    // Über uns
    if (pageContent.ueber_uns) {
        const t = document.getElementById('ueber-uns-title');
        const s = document.getElementById('ueber-uns-subtitle');
        const p = document.getElementById('ueber-uns-text');
        if (t) t.innerHTML = pageContent.ueber_uns.title;
        if (s) s.innerHTML = pageContent.ueber_uns.subtitle;
        if (p) p.innerHTML = pageContent.ueber_uns.text;
    }

    // Kontakt
    if (pageContent.kontakt) {
        const t = document.getElementById('kontakt-title');
        const ft = document.getElementById('kontakt-form-title');
        const at = document.getElementById('kontakt-address-title');
        const a = document.getElementById('kontakt-address');
        if (t) t.innerHTML = pageContent.kontakt.title;
        if (ft) ft.innerHTML = pageContent.kontakt.form_title;
        if (at) at.innerHTML = pageContent.kontakt.address_title;
        if (a) a.innerHTML = pageContent.kontakt.address;
    }

    // Footer
    if (pageContent.footer) {
        if (pageContent.footer.ueber_uns) {
            const t = document.getElementById('footer-ueber-uns-title');
            const p = document.getElementById('footer-ueber-uns-text');
            if (t) t.innerHTML = pageContent.footer.ueber_uns.title;
            if (p) p.innerHTML = pageContent.footer.ueber_uns.text;
        }
        if (pageContent.footer.kontakt) {
            const t = document.getElementById('footer-kontakt-title');
            const addr = document.getElementById('footer-kontakt-address');
            const mail = document.getElementById('footer-kontakt-email');
            const phone = document.getElementById('footer-kontakt-phone');
            if (t) t.innerHTML = pageContent.footer.kontakt.title;
            if (addr) addr.innerHTML = pageContent.footer.kontakt.address;
            if (mail) mail.innerHTML = pageContent.footer.kontakt.email;
            if (phone) phone.innerHTML = pageContent.footer.kontakt.phone;
        }
    }
}

function loadGottesdiensteContent(pageContent) {
    // Hero
    const heroTitle = document.getElementById('gottesdienste-hero-title');
    const heroSubtitle = document.getElementById('gottesdienste-hero-subtitle');
    if (heroTitle) heroTitle.innerHTML = pageContent.hero.title;
    if (heroSubtitle) heroSubtitle.innerHTML = pageContent.hero.subtitle;

    // Expect
    const expectTitle = document.getElementById('expect-title');
    const expectGrid = document.getElementById('expect-grid');
    if (expectTitle) expectTitle.innerHTML = pageContent.expect.title;
    if (expectGrid) {
        pageContent.expect.cards.forEach(card => {
            const expectCard = document.createElement('div');
            expectCard.className = 'expect-card';
            expectCard.innerHTML = `
                <div class="icon"><i class="${card.icon}"></i></div>
                <h3>${card.title}</h3>
                <p>${card.text}</p>
            `;
            expectGrid.appendChild(expectCard);
        });
    }

    // Schedule
    const scheduleTitle = document.getElementById('schedule-title');
    const scheduleTimeline = document.getElementById('schedule-timeline');
    if (scheduleTitle) scheduleTitle.innerHTML = pageContent.schedule.title;
    if (scheduleTimeline) {
        pageContent.schedule.items.forEach((item, index) => {
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'schedule-item';
            if (index % 2 !== 0) {
                scheduleItem.classList.add('right');
            }
            scheduleItem.innerHTML = `
                <div class="icon"><i class="${item.icon}"></i></div>
                <div class="content">
                    <h4>${item.time}</h4>
                    <h5>${item.title}</h5>
                </div>
            `;
            scheduleTimeline.appendChild(scheduleItem);
        });
    }

    // Meetings
    const meetingsTitle = document.getElementById('meetings-title');
    const meetingsGrid = document.getElementById('meetings-grid');
    if (meetingsTitle) meetingsTitle.innerHTML = pageContent.meetings.title;
    if (meetingsGrid) {
        pageContent.meetings.cards.forEach(card => {
            const meetingCard = document.createElement('div');
            meetingCard.className = 'meeting-card';
            meetingCard.innerHTML = `
                <img src="${card.image}" alt="${card.title}" class="meeting-image">
                <div class="meeting-content">
                    <h3>${card.title}</h3>
                    <p>${card.subtitle}</p>
                </div>
            `;
            meetingsGrid.appendChild(meetingCard);
        });
    }
}

function loadUeberUnsContent(pageContent) {
    // Hero
    const heroTitle = document.getElementById('ueber-uns-hero-title');
    const heroSubtitle = document.getElementById('ueber-uns-hero-subtitle');
    if (heroTitle) heroTitle.innerHTML = pageContent.hero.title;
    if (heroSubtitle) heroSubtitle.innerHTML = pageContent.hero.subtitle;

    // Story
    const storyTitle = document.getElementById('story-title');
    const storyText = document.getElementById('story-text');
    if (storyTitle) storyTitle.innerHTML = pageContent.story.title;
    if (storyText) storyText.innerHTML = pageContent.story.text;

    // Beliefs
    const beliefsTitle = document.getElementById('beliefs-title');
    const beliefsGrid = document.getElementById('beliefs-grid');
    if (beliefsTitle) beliefsTitle.innerHTML = pageContent.beliefs.title;
    if (beliefsGrid) {
        pageContent.beliefs.cards.forEach(card => {
            const beliefCard = document.createElement('div');
            beliefCard.className = 'belief-card';
            beliefCard.innerHTML = `
                <div class="icon"><i class="${card.icon}"></i></div>
                <h3>${card.title}</h3>
                <p>${card.text}</p>
            `;
            beliefsGrid.appendChild(beliefCard);
        });
    }

    // Team
    const teamTitle = document.getElementById('team-title');
    const teamIntro = document.getElementById('team-intro');
    const teamGrid = document.getElementById('team-grid');
    if (teamTitle) teamTitle.innerHTML = pageContent.unser_team.title;
    if (teamIntro) teamIntro.innerHTML = pageContent.unser_team.intro;
    if (teamGrid) {
        pageContent.unser_team.members.forEach(member => {
            const teamCard = document.createElement('div');
            teamCard.className = 'team-card-professional';
            teamCard.innerHTML = `
                <img src="${member.image}" alt="${member.name}" class="team-image">
                <div class="team-info">
                    <h3>${member.name}</h3>
                    <p class="team-role">${member.role}</p>
                </div>
            `;
            teamGrid.appendChild(teamCard);
        });
    }
}

function loadSpendenContent(pageContent) {
    // Hero
    const heroTitle = document.getElementById('spenden-hero-title');
    const heroSubtitle = document.getElementById('spenden-hero-subtitle');
    if (heroTitle) heroTitle.innerHTML = pageContent.header.title;
    if (heroSubtitle) heroSubtitle.innerHTML = pageContent.header.subtitle;

    // Impact
    const impactTitle = document.getElementById('impact-title');
    const impactGrid = document.getElementById('impact-grid');
    if (impactTitle) impactTitle.innerHTML = pageContent.impact.title;
    if (impactGrid) {
        pageContent.impact.cards.forEach(card => {
            const impactCard = document.createElement('div');
            impactCard.className = 'impact-card';
            impactCard.innerHTML = `
                <div class="icon"><i class="${card.icon}"></i></div>
                <h3>${card.title}</h3>
                <p>${card.text}</p>
            `;
            impactGrid.appendChild(impactCard);
        });
    }

    // Bank Details
    const bankReceiver = document.getElementById('bank-receiver');
    const bankIban = document.getElementById('bank-iban');
    const bankBic = document.getElementById('bank-bic');
    const bankName = document.getElementById('bank-name');
    if (bankReceiver) bankReceiver.innerHTML = pageContent.spenden_info.bank.receiver;
    if (bankIban) bankIban.innerHTML = pageContent.spenden_info.bank.iban;
    if (bankBic) bankBic.innerHTML = pageContent.spenden_info.bank.bic;
    if (bankName) bankName.innerHTML = pageContent.spenden_info.bank.bank;

    // FAQ
    const faqTitle = document.getElementById('faq-title');
    const faqAccordion = document.getElementById('faq-accordion');
    if (faqTitle) faqTitle.innerHTML = pageContent.faq.title;
    if (faqAccordion) {
        pageContent.faq.questions.forEach(item => {
            const details = document.createElement('details');
            details.innerHTML = `
                <summary>${item.question}</summary>
                <p>${item.answer}</p>
            `;
            faqAccordion.appendChild(details);
        });
    }

    // Amount Chips
    document.querySelectorAll('.amount-chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.amount-chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.amount;
        const input = document.querySelector('.amount-input-container input[name="amount"]');
        if (val && +val > 0) input.value = val; else input.focus();
      });
    });

    // Copy Buttons
    document.querySelectorAll('.copy-btn').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const selector = btn.dataset.copy;
        const elementToCopy = document.querySelector(selector);
        if (!elementToCopy) return;
        try{
          await navigator.clipboard.writeText(elementToCopy.innerText || '');
          btn.innerHTML = '<i class="fa-solid fa-check"></i>';
          setTimeout(()=>btn.innerHTML='<i class="fa-regular fa-copy"></i>',1200);
        }catch(e){ console.warn('Clipboard failed', e); }
      });
    });
}

function loadDatenschutzContent(pageContent) {
    if (pageContent.header) {
        const img = document.getElementById('datenschutz-header-image');
        const ttl = document.getElementById('datenschutz-header-title');
        if (img) img.src = pageContent.header.image;
        if (ttl) ttl.innerHTML = pageContent.header.title;
    }

    if (pageContent.content) {
        const contentContainer = document.getElementById('datenschutz-content');
        if (contentContainer) {
            pageContent.content.forEach(item => {
                const el = document.createElement(item.type);
                el.innerHTML = item.text;
                contentContainer.appendChild(el);
            });
        }
    }
}

function loadImpressumContent(pageContent) {
    if (pageContent.header) {
        const img = document.getElementById('impressum-header-image');
        const ttl = document.getElementById('impressum-header-title');
        if (img) img.src = pageContent.header.image;
        if (ttl) ttl.innerHTML = pageContent.header.title;
    }

    if (pageContent.content) {
        const contentContainer = document.getElementById('impressum-content');
        if (contentContainer) {
            pageContent.content.forEach(item => {
                const el = document.createElement(item.type);
                el.innerHTML = item.text;
                contentContainer.appendChild(el);
            });
        }
    }
}
