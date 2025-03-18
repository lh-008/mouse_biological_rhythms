document.addEventListener('DOMContentLoaded', function() {
    // Get all sections for scrollytelling
    const sections = document.querySelectorAll('.scrolly-section, .fullscreen-section');
    const navItems = document.querySelectorAll('#section-nav a');
    const narratives = document.querySelectorAll('.narrative');
    const visualizations = document.querySelectorAll('.visualization-container');
    const progressBar = document.querySelector('.progress-bar');
    
    // Function to check if an element is in viewport
    function isInViewport(element, threshold = 0.3) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight * (1 - threshold)) &&
            rect.bottom >= (window.innerHeight * threshold)
        );
    }
    
    // Function to update navigation and animations based on scroll position
    function updateOnScroll() {
        const scrollPosition = window.scrollY;
        const totalHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercentage = (scrollPosition / totalHeight) * 100;
        progressBar.style.width = scrollPercentage + '%';
        
        // Check each section and update navigation
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            // Check if we're in this section
            if (scrollPosition >= sectionTop - window.innerHeight/2 && 
                scrollPosition < sectionTop + sectionHeight - window.innerHeight/2) {
                
                // Update navigation
                navItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('href') === `#${sectionId}`) {
                        item.classList.add('active');
                    }
                });
            }
        });
        
        // Check narratives for animation
        narratives.forEach(narrative => {
            if (isInViewport(narrative, 0.2)) {
                narrative.classList.add('visible');
            }
        });
        
        // Check visualizations for animation
        visualizations.forEach(visualization => {
            if (isInViewport(visualization, 0.1)) {
                visualization.classList.add('visible');
            }
        });
    }
    
    // Function to handle smooth scrolling for navigation
    function initSmoothScrolling() {
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                window.scrollTo({
                    top: targetSection.offsetTop,
                    behavior: 'smooth'
                });
            });
        });
    }

    // Function to handle the "scroll to continue" arrow click
    function initScrollIndicator() {
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', function() {
                const nextSection = document.querySelector('#understanding');
                if (nextSection) {
                    window.scrollTo({
                        top: nextSection.offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        }
    }
    
    function init() {
        // Add initial visible class to elements at the top
        document.querySelectorAll('.scrolly-section:first-of-type .narrative, .scrolly-section:first-of-type .visualization-container').forEach(el => {
            el.classList.add('visible');
        });
        
        // Set up event listeners
        window.addEventListener('scroll', updateOnScroll);
        window.addEventListener('resize', updateOnScroll);
        
        // Initialize smooth scrolling
        initSmoothScrolling();
        
        // Initialize scroll indicator
        initScrollIndicator();
        
        // Initial check
        updateOnScroll();
    }
    
    // initialization
    init();
});