class StickyPositionManager {
    constructor() {
        this.items = [];
        this.ticking = false;

        window.addEventListener("scroll", () => {
            this.requestUpdate();
        }, { passive: true });

        window.addEventListener("resize", () => {
            this.requestUpdate();
        });

        this.lastScrollY = window.scrollY;
    }

    /**
     * 注册粘性定位元素
     * @param {string|HTMLElement} selector 元素选择器或元素
     * @param {Object} options
     * @param {string|HTMLElement} options.container 父容器选择器
     * @param {number} options.offset 顶部/底部偏移
     */
    register(selector, options = {}) {
        const element = typeof selector === "string"
            ? document.querySelector(selector)
            : selector;

        if (!element) {
            throw new Error(`Sticky element not found: ${selector}`);
        }

        const container = typeof options.container === "string"
            ? element.closest(options.container) ||
              document.querySelector(options.container)
            : options.container || element.parentElement;

        if (!container) {
            throw new Error("Sticky container not found");
        }

        const computed = getComputedStyle(element);

        element.dataset.stickyOriginalStyle =
            JSON.stringify({
                position: element.style.position,
                width: element.style.width,
                height: element.style.height,
                top: element.style.top,
                bottom: element.style.bottom,
                left: element.style.left
            });

        element.style.width = `${element.offsetWidth}px`;
        element.style.position = "fixed";

        this.items.push({
            element,
            container,
            offset: options.offset ?? 0,
            state: null,
            enabled: true
        });

        this.update();
    }


    requestUpdate() {
        if (this.ticking) {
            return;
        }

        this.ticking = true;

        requestAnimationFrame(() => {
            this.update();
            this.ticking = false;
        });
    }


    update() {
        const scrollY = window.scrollY;
        const direction = scrollY >= this.lastScrollY
            ? "down"
            : "up";

        this.lastScrollY = scrollY;


        const viewportHeight =
            window.visualViewport?.height ||
            window.innerHeight;


        for (const item of this.items) {
            this.updateItem(
                item,
                direction,
                viewportHeight
            );
        }
    }


    updateItem(item, direction, viewportHeight) {
        const {
            element,
            container,
            offset
        } = item;

        const containerRect =
            container.getBoundingClientRect();
        const containerHeight =
            container.offsetHeight;

        /*
        * 父容器不足以产生滚动粘性效果
        *
        * 注意：
        * 每次重新判断，因此视口变化后会自动恢复
        */
        if (containerHeight <= viewportHeight) {
            this.restoreNormalFlow(item);
            return;
        }


        this.enableSticky(item);

        const elementHeight =
            element.offsetHeight;
        const elementTop =
            element.getBoundingClientRect().top;
        const containerTop =
            containerRect.top;
        const containerBottom =
            containerRect.bottom;
        const viewportBottom =
            viewportHeight;


        /*
         * 父容器顶部已经出现
         */
        if (containerTop >= offset) {

            this.setPosition(
                item,
                "top",
                containerTop + offset
            );

            return;
        }


        /*
         * 父容器底部已经出现
         */
        if (containerBottom <= viewportBottom) {

            this.setPosition(
                item,
                "bottom",
                viewportHeight - containerBottom
            );

            return;
        }


        /*
         * 中间滚动区域
         */

        if (direction === "down") {

            /*
             * 元素底部离开视口
             */
            if (
                elementTop + elementHeight >
                viewportBottom - offset
            ) {
                this.setPosition(
                    item,
                    "bottom",
                    offset
                );
            }

        } else {

            /*
             * 元素顶部离开视口
             */
            if (
                elementTop < offset
            ) {
                this.setPosition(
                    item,
                    "top",
                    offset
                );
            }
        }
    }


    setPosition(item, type, value) {

        const {
            element
        } = item;


        const state =
            `${type}:${value}`;


        if (item.state === state) {
            return;
        }

        item.state = state;


        element.style.top = "";
        element.style.bottom = "";


        if (type === "top") {
            element.style.top =
                `${value}px`;
        }
        else {
            element.style.bottom =
                `${value}px`;
        }
    }

    restoreNormalFlow(item) {
        const {
            element
        } = item;


        if (!item.enabled) {
            return;
        }

        const original =
            JSON.parse(
                element.dataset.stickyOriginalStyle
            );


        element.style.position =
            original.position;

        element.style.width =
            original.width || "";

        element.style.height =
            original.height;

        element.style.top =
            original.top;

        element.style.bottom =
            original.bottom;

        element.style.left =
            original.left;


        item.enabled = false;
        item.state = null;
    }


    enableSticky(item) {
        const { element } = item;
        if (item.enabled) return;

        const rect = element.getBoundingClientRect();

        element.style.width = `${rect.width}px`;
        element.style.position = "fixed";
        item.enabled = true;
    }
}