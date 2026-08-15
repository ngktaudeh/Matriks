import React from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "../UI/Button";
import { useLocalStorage } from "../../hooks/useLocalStorage";

export const ThemeToggle = () => {
  const [theme, setTheme] = useLocalStorage("matriks-theme", "light");

  React.useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === "dark" ? "Mode terang" : "Mode gelap"}>
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
};
