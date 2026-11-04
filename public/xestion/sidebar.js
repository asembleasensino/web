(function () {
  function restoreGroups() {
    document.querySelectorAll(".nav-group").forEach((group) => {
      const key = "aaep-xestion-nav-group-" + group.dataset.group;
      const toggle = group.querySelector(".nav-group-toggle");
      const body = group.querySelector(".nav-group-body");
      if (!toggle || !body) return;

      let collapsed = false;
      try {
        collapsed = localStorage.getItem(key) === "1";
      } catch {
        /* localStorage indisponible (modo privado, etc.) -- queda sempre despregado */
      }
      if (collapsed) {
        toggle.setAttribute("aria-expanded", "false");
        body.hidden = true;
      }

      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") !== "false";
        toggle.setAttribute("aria-expanded", String(!expanded));
        body.hidden = expanded;
        try {
          localStorage.setItem(key, expanded ? "1" : "0");
        } catch {
          /* non pasa nada se non se pode gardar a preferencia */
        }
      });
    });
  }

  function restoreSidebar() {
    const sidebar = document.querySelector("#xestion-sidebar");
    const toggle = document.querySelector("#sidebar-toggle");
    if (!sidebar || !toggle) return;
    const key = "aaep-xestion-sidebar-collapsed";

    function apply(collapsed) {
      sidebar.classList.toggle("collapsed", collapsed);
      const label = collapsed ? "Despregar menú" : "Pregar menú";
      toggle.textContent = collapsed ? "»" : "«";
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
    }

    let collapsed = false;
    try {
      collapsed = localStorage.getItem(key) === "1";
    } catch {
      /* sen localStorage, queda sempre despregado */
    }
    apply(collapsed);

    toggle.addEventListener("click", () => {
      collapsed = !collapsed;
      try {
        localStorage.setItem(key, collapsed ? "1" : "0");
      } catch {
        /* non pasa nada se non se pode gardar a preferencia */
      }
      apply(collapsed);
    });
  }

  restoreGroups();
  restoreSidebar();
})();
