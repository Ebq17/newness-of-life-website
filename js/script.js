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
    const currentPath = location.pathname.replace(/\/index\.html?$/, '/');
    document.querySelectorAll('.nav-links a[href]').forEach(a => {
        const url = new URL(a.getAttribute('href'), location.origin);
        const path = url.pathname.replace(/\/index\.html?$/, '/');
        if (path === currentPath) {
            a.classList.add('active');
        }
    });

    // --- Smooth Scrolling (nur bei existierendem Ziel) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        const target = document.querySelector(anchor.getAttribute('href'));
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

    
});

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