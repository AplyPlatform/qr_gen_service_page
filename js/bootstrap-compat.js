/**
 * bootstrap-compat.js
 * Bootstrap JS 없이 Modal / Dropdown 동작을 구현
 *
 * 지원 기능:
 *  - $.fn.modal('show' | 'hide' | 'toggle' | { show: true })
 *  - data-dismiss="modal" 버튼
 *  - shown.bs.modal / hidden.bs.modal jQuery 이벤트
 *  - data-toggle="dropdown" 드롭다운 (Bootstrap 3 .open 방식)
 */
(function ($) {
    'use strict';

    /* ============================================================
       Modal
       ============================================================ */

    var ANIMATION_DURATION = 300;
    var BACKDROP_DURATION  = 150;

    /**
     * 현재 열려 있는 backdrop DOM element
     * (동시에 하나의 모달만 열린다고 가정)
     */
    var $currentBackdrop = null;

    function createBackdrop() {
        $currentBackdrop = $('<div class="modal-backdrop fade"></div>');
        $('body').append($currentBackdrop);
        // reflow 강제 → CSS transition 시작
        $currentBackdrop[0].offsetWidth;
        $currentBackdrop.addClass('in');
    }

    function removeBackdrop(callback) {
        if (!$currentBackdrop) {
            if (callback) callback();
            return;
        }
        $currentBackdrop.removeClass('in');
        var $bd = $currentBackdrop;
        $currentBackdrop = null;
        setTimeout(function () {
            $bd.remove();
            if (callback) callback();
        }, BACKDROP_DURATION);
    }

    function showModal($modal) {
        // 이미 열려 있으면 무시
        if ($modal.data('bs.open')) return;
        $modal.data('bs.open', true);

        createBackdrop();

        // display:block 설정 후 reflow → in 클래스 추가로 slide-down 애니메이션
        $modal.css('display', 'block');
        $modal[0].offsetWidth; // reflow
        $modal.addClass('in');

        $('body').addClass('modal-open');

        // 애니메이션 종료 후 shown 이벤트 발생
        setTimeout(function () {
            $modal.trigger('shown.bs.modal');
        }, ANIMATION_DURATION);
    }

    function hideModal($modal) {
        if (!$modal.data('bs.open')) return;
        $modal.data('bs.open', false);

        $modal.removeClass('in');

        setTimeout(function () {
            $modal.css('display', 'none');
            removeBackdrop(function () {
                $('body').removeClass('modal-open');
                $modal.trigger('hidden.bs.modal');
            });
        }, ANIMATION_DURATION);
    }

    /**
     * jQuery 플러그인: $(...).modal(option)
     * option: 'show' | 'hide' | 'toggle' | { show: true|false }
     */
    $.fn.modal = function (option) {
        return this.each(function () {
            var $modal = $(this);

            var action = option;
            if (typeof option === 'object' && option !== null) {
                action = option.show ? 'show' : 'hide';
            }

            if (action === 'show') {
                showModal($modal);
            } else if (action === 'hide') {
                hideModal($modal);
            } else if (action === 'toggle') {
                if ($modal.data('bs.open')) {
                    hideModal($modal);
                } else {
                    showModal($modal);
                }
            }
        });
    };

    /* ---- data-dismiss="modal" 버튼 클릭 ---- */
    $(document).on('click', '[data-dismiss="modal"]', function () {
        var $modal = $(this).closest('.modal');
        if ($modal.length) {
            hideModal($modal);
        }
    });

    /* ---- 모달 배경(modal 자체) 클릭 시 닫기 ---- */
    $(document).on('click', '.modal', function (e) {
        // modal-dialog 바깥(즉 반투명 배경 영역)을 클릭했을 때만
        if ($(e.target).hasClass('modal')) {
            hideModal($(this));
        }
    });


    /* ============================================================
       Dropdown  (Bootstrap 3 방식: 부모에 .open 클래스 토글)
       ============================================================ */

    function closeAllDropdowns() {
        $('.dropdown.open').each(function () {
            $(this).removeClass('open')
                   .find('[data-toggle="dropdown"]')
                   .attr('aria-expanded', 'false');
        });
    }

    /* 토글 버튼 클릭 */
    $(document).on('click', '[data-toggle="dropdown"]', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $toggle = $(this);
        var $parent = $toggle.closest('.dropdown');
        var isOpen  = $parent.hasClass('open');

        closeAllDropdowns();

        if (!isOpen) {
            $parent.addClass('open');
            $toggle.attr('aria-expanded', 'true');
        }
    });

    /* 드롭다운 외부 클릭 시 닫기 */
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.dropdown').length) {
            closeAllDropdowns();
        }
    });

    /* 드롭다운 메뉴 내부 클릭 시 닫기 (다운로드 항목 선택 후 닫힘) */
    $(document).on('click', '.dropdown-menu a, .dropdown-menu .qrDownloadButton', function () {
        closeAllDropdowns();
    });

})(jQuery);
