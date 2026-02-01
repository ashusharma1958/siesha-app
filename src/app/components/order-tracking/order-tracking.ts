import { Component } from '@angular/core';
import { Navigation } from '../navigation/navigation';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [Navigation],
  templateUrl: './order-tracking.html',
  styleUrls: ['./order-tracking.css']
})
export class OrderTrackingComponent {
  constructor() {}
}
