/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.concurrent.atomic.AtomicInteger;

public class Test {
    public static long timer = 0, totals = 0;
    public static AtomicInteger counter;

    public void addText(Object response) {
        int num = counter.incrementAndGet();
        if(num%10000 == 1 && num!=1)
        {
            totals += counter.getAndSet(0);
            Calendar now = GregorianCalendar.getInstance();
            now = GregorianCalendar.getInstance();
            System.out.println("Messages Per Second : " + ((totals) / ((now.getTimeInMillis() - Test.timer))*1000));

            System.out.println( totals + " messages received - " + response.toString());
        }
    }
}
