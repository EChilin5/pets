import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

gsap.registerPlugin(ScrollTrigger);
let cont = document.querySelector('.container')


ScrollTrigger.create({
  scroller: '.container',
  start: 1,
  markers: false,
  end: () => ScrollTrigger.maxScroll(cont) -1,
  onLeave: self => {
    self.scroll(2);
    ScrollTrigger.update();
  },
  onLeaveBack: self => {
    self.scroll(ScrollTrigger.maxScroll(cont) - 2);
    ScrollTrigger.update();
  }
});
